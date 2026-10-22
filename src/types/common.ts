/** Small type-level helpers used across features. */

/** Mark specific keys of `T` as required. */
export type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** A value that may still be loading. */
export type Nullable<T> = T | null;

/** Props every presentational component accepts. */
export interface StyleProps {
  className?: string | undefined;
}
