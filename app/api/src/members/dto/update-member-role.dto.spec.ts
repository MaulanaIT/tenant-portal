import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateMemberRoleDto } from './update-member-role.dto.js';

function errorsFor(body: Record<string, unknown>) {
  return validate(plainToInstance(UpdateMemberRoleDto, body));
}

describe('UpdateMemberRoleDto', () => {
  it.each([
    ['an unsupported role', { role: 'OWNER' }],
    ['a lowercase role', { role: 'admin' }],
    ['a missing role', {}],
    ['a null role', { role: null }],
    ['a numeric role', { role: 1 }],
  ])('rejects %s', async (_label, body) => {
    const errors = await errorsFor(body);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('role');
    expect(errors[0].constraints).toEqual({
      isEnum: 'role must be one of: ADMIN, MEMBER',
    });
  });

  it.each(['ADMIN', 'MEMBER'])('accepts %s', async (role) => {
    await expect(errorsFor({ role })).resolves.toEqual([]);
  });
});
