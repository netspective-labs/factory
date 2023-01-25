// Extracted from https://github.com/tinysource/tinysource/tree/main/schema
// and renamed to "Axiom" instead of "Schema" since schema is easily confused
// with RDBMS Schema and SQL DDL. Big thanks to Chris for creating schema.ts!

// Changes: (reviewed with Chris on Jun 10, 2022)
// - renamed Schema* to Axiom*
// - changed AxiomObjectType to AxiomObjectTypeStrict and forced default strict
// - added AxiomOptional type and and isAxiomOptional guard to ease reflection
// - added AxiomObjectProperty signature to all properties of objects to ease
//   reflection capabilities (use isAxiomObjectProperty to test at build-time)
// - added axiomObjectDecl and axiomObjectDeclPropNames to AxiomObject to ease
//   reflection (consumers may need the original object declarations)
// - added $.date axiom
// - added isAxiom guard
// - changed SmartPartial to organize required properties earlier than optional
// - changed test cases to use Deno unit testing

// Changes: (after reviewed with Chris on Jun 10, 2022)
// - exported `create`
// - exported types Primitive, UnionToIntersection, OptionalKeys, RequiredKeys, SmartPartial

// deno-lint-ignore-file no-explicit-any
type Primitive = bigint | boolean | number | string | symbol | null | undefined;

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends
  (x: infer V) => any ? V : never;

type OptionalKeys<T> = {
  readonly [P in keyof T]: undefined extends T[P] ? P : never;
}[keyof T];
type RequiredKeys<T> = {
  readonly [P in keyof T]: undefined extends T[P] ? never : P;
}[keyof T];
type SmartPartial<T> =
  & Pick<T, RequiredKeys<T>>
  & Partial<Pick<T, OptionalKeys<T>>>;

// eslint-disable-next-line functional/prefer-readonly-type
type Simplify<T> = T extends Record<string, unknown> ? { [P in keyof T]: T[P] }
  : T;

/**
 * Infer the parsed type from a type-safe structure ("axiom").
 */
type AxiomType<TAxiom> = TAxiom extends Axiom<infer TType> ? TType : never;
// eslint-disable-next-line functional/prefer-readonly-type
type AxiomTupleType<TAxioms> = { [P in keyof TAxioms]: AxiomType<TAxioms[P]> };

// "strict" objects allow only build-time defined properties
// the original tinysource/schema did not have strict objects
type AxiomObjectTypeStrict<TAxioms, TIndexType> = SmartPartial<
  AxiomTupleType<TAxioms>
>;

// "relaxed" objects allow properties to be defined at run-time
// the original tinysource/schema allowed relaxed only
type AxiomObjectTypeRelaxed<TAxioms, TIndexType> =
  & Record<string, TIndexType>
  & SmartPartial<AxiomTupleType<TAxioms>>;

type AxiomOptions = {
  readonly onInvalid?: (reason: string) => void;
  readonly path?: readonly (number | string)[];
};

type AxiomContext = {
  readonly onInvalid: (reason?: string) => void;
  /**
   * Readonly string/number array which stringifies to a JSON path.
   */
  readonly path: readonly (number | string)[];
};

type AxiomOptional = { isAxiomOptional: true };

const isAxiomOptional = (o: unknown): o is AxiomOptional =>
  o && (typeof o === "object") && ("isAxiomOptional" in o) ? true : false;

type Axiom<TType> = {
  /**
   * Shortcut to union this axiom with `$.undefined`.
   */
  readonly optional: () => Axiom<TType | undefined> & AxiomOptional;
  /**
   * Return the unmodified `value` if it matches the axiom. Otherwise, throw
   * an error.
   */
  readonly parse: (value: unknown) => TType;
  /**
   * Returns true if the `value` matches the axiom. Otherwise, return false.
   * The `onInvalid` callback will be called for each JSON path that does not
   * match the axiom.
   */
  readonly test: (value: unknown, options?: AxiomOptions) => value is TType;
};

function isAxiom<TType>(o: unknown): o is Axiom<TType> {
  if (
    o && (typeof o === "object") &&
      ("parse" in o && "test" in o && "optional" in o)
      ? true
      : false
  ) {
    return true;
  }
  return false;
}

type MutatableAxiomObjectProperty<PropertyName extends string> = {
  axiomObjectPropertyName: PropertyName;
};

type AxiomObjectProperty<PropertyName extends string> = Readonly<
  MutatableAxiomObjectProperty<PropertyName>
>;

function isAxiomObjectProperty<PropertyName extends string>(
  o: unknown,
): o is AxiomObjectProperty<PropertyName> {
  if (o && typeof o === "object") {
    return "axiomObjectPropertyName" in o;
  }
  return false;
}

function transformToAxiomObjectProperty<PropertyName extends string>(
  axiomPropertyName: PropertyName,
  o: Axiom<any>,
): Axiom<any> & AxiomObjectProperty<PropertyName> | false {
  if (isAxiomObjectProperty<PropertyName>(o)) {
    return o;
  }
  if (typeof o === "object") {
    (o as unknown as MutatableAxiomObjectProperty<PropertyName>)
      .axiomObjectPropertyName = axiomPropertyName as PropertyName;
    return o as unknown as (Axiom<any> & AxiomObjectProperty<PropertyName>);
  }
  return false;
}

type AxiomObject<
  TType,
  TPropAxioms extends Record<string, Axiom<any>>,
  TIndexType,
> = Axiom<TType> & {
  /**
   * Re-construct the object/record axiom with all properties as optional.
   */
  readonly partial: () => AxiomObject<
    Simplify<Partial<TType>>,
    TPropAxioms,
    TIndexType
  >;
  readonly axiomObjectDecl: TPropAxioms;
  readonly axiomObjectDeclPropNames: (keyof TType & string)[];
};

const isObject = (value: any): value is Record<string, any> =>
  typeof value === "object" && value !== null;

const lazy = <TType>(callback: () => TType): () => TType => {
  let cached: { value: TType } | undefined;

  return () => {
    if (!cached) {
      cached = { value: callback() };
    }

    return cached.value;
  };
};

const create = <TType>(
  test: (value: unknown, context: AxiomContext) => value is TType,
): Axiom<TType> => {
  const axiom: Axiom<TType> = {
    optional: lazy(() => ({
      ...$.union(axiom, $.undefined),
      isAxiomOptional: true,
    })),
    parse: (value) => {
      axiom.test(value, {
        onInvalid: (reason) => {
          throw new Error(reason);
        },
      });

      return value as TType;
    },
    test: (value, { onInvalid, path = [] } = {}): value is TType => {
      let valid = true;
      let pathString: string | undefined;

      const context: AxiomContext = {
        onInvalid: (reason) => {
          valid = false;

          if (onInvalid) {
            onInvalid(reason ?? `Unexpected type at ${context.path}`);
          }
        },
        path: Object.assign(path, {
          toString: () => {
            if (pathString == null) {
              pathString = path.reduce<string>((result, segment) => {
                return (
                  result +
                  (typeof segment === "string" && /^[a-z0-9_]+$/gi.test(segment)
                    ? `.${segment}`
                    : `[${JSON.stringify(segment)}]`)
                );
              }, "$");
            }

            return pathString;
          },
        }),
      };

      const success = test(value, context);

      if (!success && valid) {
        context.onInvalid();
      }

      return valid;
    },
  };

  return axiom;
};

const createObject = <
  TPropAxioms extends Record<string, Axiom<any>>,
  TIndexType,
>(
  props: TPropAxioms,
  index: Axiom<TIndexType> | undefined,
): AxiomObject<
  Simplify<AxiomObjectTypeStrict<TPropAxioms, TIndexType>>,
  TPropAxioms,
  TIndexType
> => {
  for (const entry of Object.entries(props)) {
    const [name, value] = entry;
    transformToAxiomObjectProperty<
      keyof Simplify<AxiomObjectTypeStrict<TPropAxioms, TIndexType>> & string
    >(name as any, value);
  }

  const objectAxiom: AxiomObject<
    Simplify<AxiomObjectTypeStrict<TPropAxioms, TIndexType>>,
    TPropAxioms,
    TIndexType
  > = {
    ...create(
      (
        value,
        { path, ...context },
      ): value is Simplify<AxiomObjectTypeStrict<TPropAxioms, TIndexType>> =>
        isObject(value) &&
        Object.entries(props).every(([key, axiom]) =>
          axiom.test(value[key], { ...context, path: [...path, key] })
        ) &&
        (!index ||
          Object.entries(value).every(
            ([key, value_]) =>
              key in props ||
              index.test(value_, { ...context, path: [...path, key] }),
          )),
    ),
    partial: lazy(() => {
      const partialProps: Record<string, Axiom<any>> = {};
      Object.entries(props).forEach((
        [key, axiom],
      ) => (partialProps[key] = axiom.optional()));
      return createObject(partialProps, index && index.optional()) as never;
    }),
    axiomObjectDecl: props as any,
    axiomObjectDeclPropNames: Object.keys(props) as any,
  };

  return objectAxiom;
};

// Memoized
const string = create((value): value is string =>
  typeof value === "string" || value instanceof String
);
const number = create((value): value is number =>
  typeof value === "number" || value instanceof Number
);
const bigint = create((value): value is bigint =>
  typeof value === "bigint" || value instanceof BigInt
);
const boolean = create((value): value is boolean =>
  typeof value === "boolean" || value instanceof Boolean
);
const symbol = create((value): value is symbol =>
  typeof value === "symbol" || value instanceof Symbol
);
const date = create((value): value is Date => value instanceof Date);
const undefined_ = create((value): value is undefined =>
  typeof value === "undefined"
);
const null_ = create((value): value is null => value === null);
const unknown = create((_value): _value is unknown => true);
const any = unknown as Axiom<any>;
const function_ = create(
  (value): value is (...args: unknown[]) => unknown =>
    typeof value === "function" || value instanceof Function,
);

// Non-memoized
const instance = <TType>(constructor: new (...args: readonly any[]) => TType) =>
  create((value): value is TType => value instanceof constructor);
const enum_ = <TType extends readonly [Primitive, ...(readonly Primitive[])]>(
  ...values: TType
) => create((value): value is TType[number] => values.includes(value as never));
const array = <TType>(axiom?: Axiom<TType>) =>
  create(
    (value, { path, ...context }): value is TType[] =>
      Array.isArray(value) &&
      (!axiom ||
        value.every((item, index) =>
          axiom.test(item, { ...context, path: [...path, index] })
        )),
  );
const tuple = <TAxioms extends readonly Axiom<any>[]>(...elements: TAxioms) =>
  create(
    (value, { path, ...context }): value is AxiomTupleType<TAxioms> =>
      Array.isArray(value) &&
      elements.length === value.length &&
      elements.every((element, index) =>
        element.test(value[index], { ...context, path: [...path, index] })
      ),
  );
const record = <TType>(index?: Axiom<TType>) => createObject({}, index);
const object = <TPropAxioms extends Record<string, Axiom<any>>, TIndexType>(
  props: TPropAxioms,
  index?: Axiom<TIndexType>,
) => createObject(props, index);

// Combinatorial
const union = <
  TAxioms extends readonly [Axiom<any>, ...(readonly Axiom<any>[])],
>(...axioms: TAxioms) =>
  create((value): value is AxiomType<TAxioms[number]> =>
    axioms.some((axiom) => axiom.test(value))
  );
const intersection = <
  TAxioms extends readonly [Axiom<any>, ...(readonly Axiom<any>[])],
>(...axioms: TAxioms) =>
  create((
    value,
    context,
  ): value is UnionToIntersection<AxiomType<TAxioms[number]>> =>
    axioms.every((axiom) => axiom.test(value, context))
  );

const $ = {
  ...{
    any,
    array,
    bigint,
    boolean,
    custom: create,
    enum: enum_,
    function: function_,
    instance,
    intersection,
  },
  ...{
    null: null_,
    number,
    object,
    record,
    string,
    date,
    symbol,
    tuple,
    undefined: undefined_,
    union,
    unknown,
  },
} as const;

export {
  $,
  type Axiom,
  type AxiomContext,
  type AxiomObject,
  type AxiomObjectProperty,
  type AxiomObjectTypeStrict,
  type AxiomOptions,
  type AxiomType,
  create,
  isAxiom,
  isAxiomObjectProperty,
  isAxiomOptional,
  type OptionalKeys,
  type Primitive,
  type RequiredKeys,
  type Simplify,
  type SmartPartial,
  type UnionToIntersection,
};
