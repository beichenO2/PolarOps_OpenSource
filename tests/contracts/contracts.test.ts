import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'node:fs';
import path from 'node:path';

const CONTRACTS_DIR = path.join(import.meta.dirname, '..', '..', 'contracts');
const EXAMPLES_DIR = path.join(CONTRACTS_DIR, 'examples');

const ajv = new Ajv({ strict: false });
addFormats(ajv);

function loadJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

describe('PolarOps contracts', () => {
  it('checkup-api.schema.json is valid JSON Schema', () => {
    const schema = loadJson(path.join(CONTRACTS_DIR, 'checkup-api.schema.json'));
    const validate = ajv.compile(schema);
    expect(typeof validate).toBe('function');
  });

  it('monitor-api.schema.json is valid JSON Schema', () => {
    const schema = loadJson(path.join(CONTRACTS_DIR, 'monitor-api.schema.json'));
    const validate = ajv.compile(schema);
    expect(typeof validate).toBe('function');
  });

  it('checkup-event example validates against checkup-api schema', () => {
    const schema = loadJson(path.join(CONTRACTS_DIR, 'checkup-api.schema.json'));
    const example = loadJson(path.join(EXAMPLES_DIR, 'checkup-event.example.json'));
    const validate = ajv.compile(schema);
    expect(validate(example)).toBe(true);
  });

  it('monitor-status example validates against monitor-api schema', () => {
    const schema = loadJson(path.join(CONTRACTS_DIR, 'monitor-api.schema.json'));
    const example = loadJson(path.join(EXAMPLES_DIR, 'monitor-status.example.json'));
    const validate = ajv.compile(schema);
    expect(validate(example)).toBe(true);
  });
});
