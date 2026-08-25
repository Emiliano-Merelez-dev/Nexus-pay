import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @OneToMany(() => Merchant, (merchant) => merchant.user)
  merchants?: Merchant[];
}
