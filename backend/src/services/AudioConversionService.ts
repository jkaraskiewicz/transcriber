import ffmpeg from 'fluent-ffmpeg';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { logger } from '../utils/logger';

// Use system ffmpeg (installed via Docker or package manager)
// No need to set path - ffmpeg command will be available in PATH

export interface ConvertedAudio {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

export class AudioConversionService {
  async convertToMp3(file: Express.Multer.File): Promise<ConvertedAudio> {
    logger.info('Starting audio conversion to MP3', {
      filename: file.originalname,
      originalMimetype: file.mimetype,
      size: file.size,
    });

    // Write buffer to temp file so ffmpeg can auto-detect format
    const tempInputPath = join(tmpdir(), `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    const tempOutputPath = join(tmpdir(), `output-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mp3`);

    try {
      await writeFile(tempInputPath, file.buffer);
    } catch (error) {
      logger.error('Failed to write temp file', error);
      await unlink(tempInputPath).catch(() => {});
      throw new Error('Failed to prepare audio file for conversion');
    }

    return new Promise((resolve, reject) => {
        ffmpeg(tempInputPath)
          .audioCodec('libmp3lame')
          .audioBitrate('192k')
          .audioChannels(1)
          .audioFrequency(16000)
          .format('mp3')
          .on('start', (commandLine) => {
            logger.debug('FFmpeg process started', { command: commandLine });
          })
          .on('progress', (progress) => {
            logger.debug('Conversion progress', progress);
          })
          .on('error', async (err) => {
            logger.error('Audio conversion failed', err, {
              filename: file.originalname,
            });
            // Clean up temp files
            await unlink(tempInputPath).catch(() => {});
            await unlink(tempOutputPath).catch(() => {});
            reject(new Error(`Audio conversion failed: ${err.message}`));
          })
          .on('end', async () => {
            try {
              // Read converted file
              const fs = await import('fs/promises');
              const convertedBuffer = await fs.readFile(tempOutputPath);

              logger.info('Audio conversion completed', {
                filename: file.originalname,
                originalSize: file.size,
                convertedSize: convertedBuffer.length,
              });

              // Clean up temp files
              await unlink(tempInputPath).catch(() => {});
              await unlink(tempOutputPath).catch(() => {});

              resolve({
                buffer: convertedBuffer,
                mimetype: 'audio/mpeg',
                originalname: file.originalname.replace(/\.[^.]+$/, '.mp3'),
              });
            } catch (readError) {
              logger.error('Failed to read converted file', readError);
              await unlink(tempInputPath).catch(() => {});
              await unlink(tempOutputPath).catch(() => {});
              reject(new Error('Failed to read converted audio file'));
            }
          })
          .save(tempOutputPath);
    });
  }
}
