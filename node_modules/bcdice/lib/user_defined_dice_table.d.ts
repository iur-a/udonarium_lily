import '../lib/bcdice/user_defined_dice_table';
import { UserDefinedDiceTableInstance } from './internal/types/user_defined_dice_table';
import { RandomizerInstance } from './internal/types/randomizer';
import Result from './result';
export default class UserDefinedDiceTable {
    private readonly internal;
    constructor(text: string, internal?: UserDefinedDiceTableInstance);
    roll(randomizer?: RandomizerInstance): Result | null;
    validate(): boolean;
}
