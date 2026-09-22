import 'reflect-metadata';

export const TRANSFORM_METADATA = Symbol('transform:metadata');

export interface TransformOptions {
  toClassOnly?: boolean;
  toPlainOnly?: boolean;
  groups?: string[];
}

export interface TransformFn {
  (value: any, obj: any): any;
}

export function Transform(
  transformFn: TransformFn,
  options?: TransformOptions
): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const existingTransforms = Reflect.getMetadata(TRANSFORM_METADATA, target.constructor) || {};
    
    existingTransforms[propertyKey] = {
      fn: transformFn,
      options: options || {},
    };
    
    Reflect.defineMetadata(TRANSFORM_METADATA, existingTransforms, target.constructor);
  };
}

export function ToInt(): PropertyDecorator {
  return Transform((value) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  });
}

export function ToFloat(): PropertyDecorator {
  return Transform((value) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? value : parsed;
  });
}

export function ToBoolean(): PropertyDecorator {
  return Transform((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
    }
    if (typeof value === 'number') return value !== 0;
    return Boolean(value);
  });
}

export function ToDate(): PropertyDecorator {
  return Transform((value) => {
    if (value instanceof Date) return value;
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date;
  });
}

export function ToLowerCase(): PropertyDecorator {
  return Transform((value) => {
    return typeof value === 'string' ? value.toLowerCase() : value;
  });
}

export function ToUpperCase(): PropertyDecorator {
  return Transform((value) => {
    return typeof value === 'string' ? value.toUpperCase() : value;
  });
}

export function Trim(): PropertyDecorator {
  return Transform((value) => {
    return typeof value === 'string' ? value.trim() : value;
  });
}

export function ToArray(): PropertyDecorator {
  return Transform((value) => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
  });
}

export function DefaultValue(defaultVal: any): PropertyDecorator {
  return Transform((value) => {
    return value === null || value === undefined ? defaultVal : value;
  });
}

export function applyTransforms<T extends object>(instance: T): T {
  const transforms = Reflect.getMetadata(TRANSFORM_METADATA, instance.constructor);
  
  if (!transforms) return instance;
  
  for (const [key, config] of Object.entries(transforms)) {
    const { fn } = config as { fn: TransformFn };
    const currentValue = (instance as any)[key];
    (instance as any)[key] = fn(currentValue, instance);
  }
  
  return instance;
}
