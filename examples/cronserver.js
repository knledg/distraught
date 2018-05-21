require('distraught').cronServer({
  crons: [{
    name: 'Console.log `tick` every 5 seconds',
    cronTime: '*/5 * * * * *',
    onTick: () => {
      console.log('tick'); // eslint-disable-line
    },
  }],
});
