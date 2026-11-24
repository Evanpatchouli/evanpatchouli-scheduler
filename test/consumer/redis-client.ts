import { createClient } from 'redis';
import { RedisScheduler } from '@evanpatchouli/scheduler';

const client = createClient();
void RedisScheduler.open({ client, namespace: 'typed-client', handlers: {} });
