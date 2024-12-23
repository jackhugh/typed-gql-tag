import { Query } from '../gql-types';
import {
  useQuery,
  gql as gqlTag,
  TypedDocumentNode,
  OperationVariables,
} from '@apollo/client';

type Whitespace = '\n' | '\t' | ' ';

type Add<T extends string> = `${T}1`;
type Subtract<T> = T extends `${infer A}${infer B}` ? B : '';

type EatFirstChar<T> = T extends `${infer A}${infer B}` ? B : '';
type GetFirstChar<T> = T extends `${infer A}${infer B}` ? A : '';

type TrimStart<T extends string> = T extends `${Whitespace}${infer R}`
  ? TrimStart<R>
  : T;
type TrimEnd<T extends string> = T extends `${infer R}${Whitespace}`
  ? TrimEnd<R>
  : T;

type Trim<T extends string> = TrimStart<TrimEnd<T>>;

type TrimBrackets<T extends string> = Trim<T> extends infer B
  ? B extends `${'{'}${infer R}${'}'}`
    ? R
    : never
  : never;

/**
 * S - part of string we have already searched
 * R - remainder of string to be searched
 * O - number of open brackets encountered
 * C - number of closed brackets encountered
 */
// TODO: doesn't work for extra closing brackets???
type GetBracketPair<
  S extends string,
  R extends string,
  O extends string = '',
  C extends string = ''
> =
  // case: closing bracket
  GetFirstChar<R> extends '}'
    ? // if all opening brackets have a closing bracket
      O extends Add<C>
      ? // return the pair + remainder
        [`${S}${GetFirstChar<R>}`, EatFirstChar<R>]
      : // otherwise increment closing bracket
        GetBracketPair<`${S}${GetFirstChar<R>}`, EatFirstChar<R>, O, Add<C>>
    : // case: opening bracket
    GetFirstChar<R> extends '{'
    ? // increment opening bracket
      GetBracketPair<`${S}${GetFirstChar<R>}`, EatFirstChar<R>, Add<O>, C>
    : // case: end of string
    GetFirstChar<R> extends ''
    ? // fail
      never
    : // case: any other character
      // go to next char
      GetBracketPair<`${S}${GetFirstChar<R>}`, EatFirstChar<R>, O, C>;

type GetBracketContents<T extends string> = GetBracketPair<
  '',
  T
> extends infer R
  ? R extends [string, string]
    ? [TrimBrackets<R[0]>, TrimStart<R[1]>]
    : never
  : never;

type Token = {
  [key: string]: true | Token;
};

type GetField<
  Remainder extends string,
  Word extends string = ''
> = Remainder extends ''
  ? [Word, Trim<Remainder>]
  : GetFirstChar<Remainder> extends Whitespace
  ? [Word, Trim<Remainder>]
  : GetField<EatFirstChar<Remainder>, `${Word}${GetFirstChar<Remainder>}`>;

type GetObject<R extends string> = GetFirstChar<Trim<R>> extends '{'
  ? GetBracketContents<R>
  : never;

type GetValue<T extends string> = GetObject<T> extends never
  ? true
  : GetObject<T> extends [string, string]
  ? Tokenize<GetObject<T>[0]>
  : true;

type GetNextField<
  T extends string,
  R extends string = TrimStart<T>
> = GetFirstChar<R> extends '{' ? GetBracketContents<R>[1] : R;

type Tokenize<
  Q extends string,
  T extends Token = {},
  R extends string = TrimStart<Q>
> = R extends ''
  ? T
  : Tokenize<
      GetNextField<GetField<R>[1]>,
      T & { [P in GetField<R>[0]]: GetValue<GetField<R>[1]> }
    >;

// TODO: returns undefined sometimes
type ParseToken<T extends Token, Q extends object> = {
  [P in keyof T]: T[P] extends true
    ? P extends keyof Q
      ? Q[P]
      : never
    : T[P] extends Token
    ? P extends keyof Q
      ? Q[P] extends any[]
        ? ParseToken<T[P], Q[P][any]>[]
        : Q[P] extends object
        ? ParseToken<T[P], Q[P]>
        : never
      : never
    : never;
};

type Expand<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: Expand<O[K]> }
    : never
  : T;

type ContainsNeverHelper<T> = {
  [K in keyof T]: T[K] extends never ? true : ContainsNeverHelper<T[K]>;
}[keyof T];
type ContainsNever<T> = true extends ContainsNeverHelper<T> ? never : T;

type GraphqlBaseQuery = { __typename?: 'Query' };

function createGqlTag<Q extends GraphqlBaseQuery>() {
  return function gql<T extends string>(query: T) {
    return gqlTag(query) as TypedDocumentNode<
      Expand<ParseToken<Tokenize<T>, Q>>,
      OperationVariables
    >;
  };
}

const gql = createGqlTag<Query>();

const { data } = useQuery(
  gql(`
  user {
    id
    posts {
    }
  }
`)
);
