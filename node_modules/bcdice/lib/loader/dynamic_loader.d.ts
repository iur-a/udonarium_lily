import Loader, { I18nJsonObject } from './loader';
export default class DynamicLoader extends Loader {
    dynamicImportI18n(baseClassName: string, locale: string): Promise<I18nJsonObject>;
    dynamicImport(className: string): Promise<void>;
}
