// @flow

import {get} from 'lodash';

/**
 * All dynamic server configuration / state stored here
 */
export class ServerConfig {
  cfg: Object = {};

  constructor(cfg: ?Object) {
    if (cfg) {
      this.cfg = cfg;
    }
  }

  /**
   * If passed with 1 argument, sets the entire config object
   */
  set(key: string, value: any): void {
    this.cfg[key] = value;
  }

  get(key: string): any {
    return get(this.cfg, key);
  }
}

export const internals = new ServerConfig();
