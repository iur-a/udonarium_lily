import { SinonStub } from 'sinon';
import { RandomizerInstance } from '../internal/types/randomizer';
export declare function mockRandomizer(base: {
    randomizer: RandomizerInstance;
}): SinonStub<[number], number>;
export declare function mockedRandomizer(rands?: [number, number][]): [RandomizerInstance, SinonStub<[number], number>];
