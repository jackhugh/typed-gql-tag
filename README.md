# typed-graphql-tag

An extension for the `graphq-tag` library used by many graphql clients that infers query return types, removing the need for client-side type code-gen.

## Setup

1. Install `typed-graphql-tag`

   ```sh
   npm install --save typed-graphql-tag
   ```

2. Generate graphql server types - if you already have these, skip this step

   Install graphql-codegen

   ```sh
   npm install --save-dev @graphql-codegen/cli @graphql-codegen/typescript
   ```

   Create codegen.yml

   ```yaml
   # codegen.yml
   schema: schema.graphql
   generates:
     src/graphql-types.ts:
       - typescript
   ```

   Generate server types

   ```sh
   npx graphql-codegen
   ```

3. Create typed-graphql-tag client

   ```typescript
   // gql-tag.ts

   import { createGqlTag } from 'typed-graphql-tag';
   import { Query, Mutation } from './graphql-types';

   export const gql = createGqlTag<Query, Mutation>();
   ```

   4. Use in application (apollo example)

   ```typescript
   import { useQuery } from '@apollo/client';
   import { gql } from './gql-tag';

   // `data` is fully typed according to our `schema.graphql`
   const { data } = useQuery(
     gql(`
     query UserQuery {
       id
       name
       posts {
         id
         description
       }
     }
   `)
   );
   ```
