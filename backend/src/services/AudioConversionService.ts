import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { Readable } from 'stream';
import { logger } from '../utils/logger';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

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

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const inputStream = Readable.from(file.buffer);

      ffmpeg(inputStream)
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
        .on('error', (err) => {
          logger.error('Audio conversion failed', err, {
            filename: file.originalname,
          });
          reject(new Error(`Audio conversion failed: ${err.message}`));
        })
        .on('end', () => {
          const convertedBuffer = Buffer.concat(chunks);
          logger.info('Audio conversion completed', {
            filename: file.originalname,
            originalSize: file.size,
            convertedSize: convertedBuffer.length,
          });

          resolve({
            buffer: convertedBuffer,
            mimetype: 'audio/mpeg',
            originalname: file.originalname.replace(/\.[^.]+$/, '.mp3'),
          });
        })
        .pipe()
        .on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
    });
  }


}
