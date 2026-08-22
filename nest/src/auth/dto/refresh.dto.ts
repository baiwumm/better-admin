import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @IsNotEmpty()
  @IsString()
  refreshToken!: string;
}
