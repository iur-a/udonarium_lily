import { BaseInstance } from './internal/types/base';
export default interface Result {
    text: string;
    rands: [number, number][];
    detailedRands: {
        kind: string;
        sides: number;
        value: number;
    }[];
    secret: boolean;
    success: boolean;
    failure: boolean;
    critical: boolean;
    fumble: boolean;
}
export declare function parseResult(opal: ReturnType<BaseInstance['$eval']>): Result | null;
