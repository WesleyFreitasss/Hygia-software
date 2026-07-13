import { Options } from 'sequelize';

const config: Options = {
  username: 'root',
  password: 'password',
  database: 'Hygia',
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
};

export default config;