import mongoose from 'mongoose';
import init from './models';
import { getConfig } from '../config';

/**
 * Initializes the connection to the Database
 */
export function databaseInit() {
  if (
    getConfig()
      .DATABASE_INDIVIDUAL_CONNECTIONS_PER_REQUEST ===
    'true'
  ) {
    return _databaseUniqueConnection();
  } else {
    return _databaseSharedConnection();
  }
}

/**
 * Closes the connection to the Database if configured to close on each request.
 */
export async function databaseCloseIfIndividualConnectionPerRequest(
  database,
) {
  try {
    if (
      // Must leave the connection open for further requests
      // if not set to individual connection per request
      getConfig()
        .DATABASE_INDIVIDUAL_CONNECTIONS_PER_REQUEST ===
        'true' &&
      database
    ) {
      await database.close();
    }
  } catch (error) {
    console.error(error);
  }
}

async function _databaseUniqueConnection() {
  /**
   * Connects to MongoDB
   */
  const database = await mongoose.createConnection(
    getConfig().DATABASE_CONNECTION,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    },
  );

  init(database);

  return database;
}

async function _databaseSharedConnection() {
  /**
   * If the connection is already established,
   * returns the mongoose instance.
   */
  if (mongoose.connection.readyState) {
    return mongoose;
  }

  /**
   * Connects to MongoDB
   */
  return mongoose
    .connect(getConfig().DATABASE_CONNECTION, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    })
    .then(() => {
      init(mongoose);
    })
    .then(() => mongoose)
    .catch((error) => {
      console.error(error);

      throw error;
    });
}
