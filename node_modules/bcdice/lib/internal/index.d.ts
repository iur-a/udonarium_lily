import '../../lib/bcdice/version';
import { Module } from './opal';
import { GameSystemModule } from './types/game_system';
import { UserDefinedDiceTableClass } from './types/user_defined_dice_table';
import { RandomizerClass } from './types/randomizer';
import { BaseClass } from './types/base';
export interface BCDiceModule extends Module {
    Base: BaseClass;
    GameSystem: GameSystemModule;
    Randomizer: RandomizerClass;
    UserDefinedDiceTable: UserDefinedDiceTableClass;
    VERSION: string;
}
export interface I18nModule extends Module {
    $load_translation(json: string): void;
    $default_locale(): string;
    $clear_translate_table(): void;
}
export declare const BCDice: BCDiceModule;
export declare const I18n: I18nModule;
export { default as Opal } from './opal';
