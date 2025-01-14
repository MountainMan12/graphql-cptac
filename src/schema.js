import {readFileSync} from 'fs';

export function readSchema() {
  return readFileSync('src/schema.graphql').toString('utf-8')
}