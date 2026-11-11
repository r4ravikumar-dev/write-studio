import {createApp} from './app';
import {env} from './config/env';

createApp().listen(env.port, () => {
  console.log(`[api] listening on http://localhost:${env.port}`);
});
