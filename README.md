# @galaxy-stack/orbit-validation

[![npm version](https://img.shields.io/npm/v/@galaxy-stack/orbit-validation.svg)](https://www.npmjs.com/package/@galaxy-stack/orbit-validation)
[![docs](https://img.shields.io/badge/docs-galaxy--orbit--framework.vercel.app-blue)](https://galaxy-orbit-framework.vercel.app)

Part of the [Orbit framework](https://github.com/galaxy-orbit/packages) — a NestJS-style backend framework for [Bun](https://bun.sh).

## Installation

```bash
bun add @galaxy-stack/orbit-validation
```

# @galaxy-stack/orbit-validation

## Mô tả
Module validation cho Orbit với ValidationPipe và tích hợp Zod.

## Tính năng chính

### 1. ValidationPipe
```typescript
import { ValidationPipe, UsePipes } from '@galaxy-stack/orbit-validation';

@Controller('users')
@UsePipes(ValidationPipe)
class UserController {
  @Post()
  createUser(@Body() data: CreateUserDto) {
    return data;
  }
}
```

### 2. ZodValidationPipe
```typescript
import { z } from 'zod';
import { ZodValidationPipe } from '@galaxy-stack/orbit-validation';

const CreateUserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

@Controller('users')
class UserController {
  @Post()
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  createUser(@Body() data: z.infer<typeof CreateUserSchema>) {
    return data;
  }
}
```

### 3. Transform Decorators
```typescript
import { Transform, ToInt, ToBoolean, Trim } from '@galaxy-stack/orbit-validation';

class QueryDto {
  @ToInt()
  page!: number;

  @ToInt()
  limit!: number;

  @ToBoolean()
  active!: boolean;

  @Trim()
  search!: string;
}
```

## Cấu hình Global

```typescript
import { ValidationModule } from '@galaxy-stack/orbit-validation';

@Module({
  imports: [
    ValidationModule.forRoot({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  ],
})
class AppModule {}
```

## Validation Options

```typescript
interface ValidationOptions {
  transform?: boolean;           // Auto transform types
  whitelist?: boolean;           // Strip unknown properties
  forbidNonWhitelisted?: boolean; // Throw on unknown properties
  skipMissingProperties?: boolean;
  skipNullProperties?: boolean;
  skipUndefinedProperties?: boolean;
}
```

## Custom Validators

```typescript
import { ValidatorConstraint, Validate } from '@galaxy-stack/orbit-validation';

@ValidatorConstraint({ name: 'isUnique', async: true })
class IsUniqueConstraint {
  async validate(value: string) {
    const exists = await checkIfExists(value);
    return !exists;
  }

  defaultMessage() {
    return 'Value already exists';
  }
}

class CreateUserDto {
  @Validate(IsUniqueConstraint)
  email!: string;
}
```

## Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "age",
      "message": "Must be a positive integer"
    }
  ]
}
```
