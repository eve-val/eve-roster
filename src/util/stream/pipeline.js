import * as stream from 'stream';
import * as util from 'util';

export const pipeline = stream.pipeline;
export const pipelinePr = util.promisify(stream.pipeline);
