import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';

import { sequelize } from '../config/database';
import { NIVEIS_ACESSO, type NivelAcesso } from '../types/user';

/**
 * Model Sequelize do usuario.
 *
 * As colunas usam snake_case (`underscored: true`) e os atributos seguem o
 * camelCase do restante do codigo - o mapeamento fica por conta do Sequelize.
 * Quem consome o banco e o repositorio; services e controllers nao conhecem
 * este arquivo.
 */
export class UsuarioModel extends Model<
  InferAttributes<UsuarioModel>,
  InferCreationAttributes<UsuarioModel>
> {
  declare id: CreationOptional<string>;
  declare nome: string;
  declare email: string;
  declare senhaHash: string;
  declare nivelAcesso: NivelAcesso;
  declare tokenVersion: CreationOptional<number>;
  declare resetTokenHash: string | null;
  declare resetTokenExpiraEm: Date | null;
  declare criadoEm: CreationOptional<Date>;
  declare atualizadoEm: CreationOptional<Date>;
}

UsuarioModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: true,
    },
    senhaHash: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    nivelAcesso: {
      type: DataTypes.ENUM(...NIVEIS_ACESSO),
      allowNull: false,
    },
    tokenVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    resetTokenHash: {
      // SHA-256 em hexadecimal ocupa exatamente 64 caracteres.
      type: DataTypes.STRING(64),
      allowNull: true,
      defaultValue: null,
    },
    resetTokenExpiraEm: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    criadoEm: DataTypes.DATE,
    atualizadoEm: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Usuario',
    tableName: 'usuarios',
    underscored: true,
    timestamps: true,
    createdAt: 'criadoEm',
    updatedAt: 'atualizadoEm',
    indexes: [
      // Login busca por e-mail; a recuperacao busca pelo hash do token.
      { unique: true, fields: ['email'] },
      { fields: ['reset_token_hash'] },
    ],
  },
);
