// https://blog.bigfont.ca/data-transfer-object-wrapper/
type DataPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
export type DataPropertiesOnly<T> = { [P in DataPropertyNames<T>]?: T[P] extends object ? DataPropertiesOnly<T[P]> : T[P] };
// export type Dto<T> = DataPropertiesOnly<T>;
