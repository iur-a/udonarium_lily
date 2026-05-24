import '../lib/bcdice/arithmetic_evaluator';
import '../lib/bcdice/common_command';
import '../lib/bcdice/base';
import '../lib/bcdice/preprocessor';
import { BaseInstance } from './internal/types/base';
import Result from './result';
import { RandomizerInstance } from './internal/types/randomizer';
export default class Base {
    static eval(command: string): Result | null;
    private readonly internal;
    get randomizer(): RandomizerInstance;
    constructor(command: string, internal?: BaseInstance);
    eval(): Result | null;
}
