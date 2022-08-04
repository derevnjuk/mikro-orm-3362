import {Entity, MikroORM, PrimaryKey, Property, RequestContext} from '@mikro-orm/core';
import {MongoDriver, ObjectId} from '@mikro-orm/mongodb';
import {PostgreSqlDriver} from '@mikro-orm/postgresql';

@Entity()
export class Event {
  @PrimaryKey()
  _id!: ObjectId;

  @Property()
  title: string = '';

  constructor(title: string) {
    this.title = title;
  }
}

@Entity()
export class User {
  @PrimaryKey()
  id!: number;

  @Property()
  name: string = '';

  constructor(name: string) {
    this.name = name;
  }
}


const entrypoint = async () => {
  const pg = await MikroORM.init<PostgreSqlDriver>({
    entities: [User],
    contextName: 'pg',
    clientUrl: 'postgresql://user:password@localhost:5432/test',
    type: 'postgresql'
  });
  const mongo = await MikroORM.init<MongoDriver>({
    entities: [Event],
    contextName: 'mongo',
    clientUrl: 'mongodb://user:password@localhost:27017/test?authMechanism=SCRAM-SHA-1&authSource=admin',
    type: 'mongo'
  });

  // Cleanup DBs
  const clean = async (dispose: boolean = false): Promise<void> => {
    await pg.em.nativeDelete(User, {});
    await mongo.em.nativeDelete(Event, {});

    if (dispose) {
      await pg.close();
      await mongo.close();
    }
  };

  try {
    await RequestContext.createAsync([pg.em, mongo.em], async () => {
      await clean();

      await pg.em.transactional(async () => {
        await pg.em.persistAndFlush(new User('John'));

        // throws an exception since a transactional fork of SqlEntityManager used
        await mongo.em.persistAndFlush(new Event('Something went wrong'));
      });
    });
  } catch (e) {
    console.log(e);
  } finally {
    await clean(true);
  }
};

entrypoint();
