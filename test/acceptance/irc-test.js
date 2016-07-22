'use strict';

var expect = require('chai').expect;
var io = require('socket.io-client');
var MockServer = require('../mock-irc-server');

var spawn = require('child_process').spawn;


var socketURL = 'http://localhost:3000';

var options = {
  transports: ['websocket'],
  'force new connection': true
};

var ircServer;
var testbot1_1;
var testbot2_1;
var testbot1_2;
var testbot2_2;
var app;

beforeEach(function(done) {
  function next() {
    app = spawn("node", ['./bin/www']);
    ircServer.createClient({
      nick: 'test1',
      channel: '#test1'
    }, function(bot1) {
      testbot1_1 = bot1;

      ircServer.createClient({
        nick: 'test2',
        channel: '#test1'
      }, function(bot2) {
        testbot2_1 = bot2;

        ircServer.createClient({
          nick: 'test3',
          channel: '#test2'
        }, function(bot1) {
          testbot1_2 = bot1;

          ircServer.createClient({
            nick: 'test4',
            channel: '#test2'
          }, function(bot2) {
            testbot2_2 = bot2;

            setTimeout(done, 500);
          });
        });
      });
    });
  }
  ircServer = new MockServer(next, 6660);
});

afterEach(function(done) {
  app.kill();
  ircServer.close();
  setTimeout(done, 100);
});

describe('Heart of Gold Server', function() {

  xit('#1 should update the client after a chat command is issued', function(done) {
    var client1 = io.connect(socketURL, options);
    client1.on('connect', function() {
      client1.on('confirmConnection', function() {
        client1.emit('joinRoom', 'testStreamer');
        client1.on('joinRoom', function() {
          client1.on('update', function(update) {
            expect(update).to.exist;
            testbot1_1.part('#test1');
            client1.removeAllListeners();
            done();
          });
          testbot1_1.say('#test1', "!champ: alistar");
        });
      });
    });
  });
  xit('#2 should update two clients after a chat command is issued', function(done) {
    var client1 = io.connect(socketURL, options);
    client1.on('connect', function() {
      client1.on('confirmConnection', function() {
        client1.emit('joinRoom', 'testStreamer');
        client1.on('joinRoom', function() {

          var client2 = io.connect(socketURL, options);
          client2.on('connect', function() {
            client2.on('confirmConnection', function() {
              client2.emit('joinRoom', 'testStreamer');
              client2.on('joinRoom', function() {
                var replies = 0;

                function finish() {
                  if (replies === 2) {
                    testbot1_1.part('#test1');
                    testbot2_1.part('#test1');
                    client1.removeAllListeners();
                    client2.removeAllListeners();
                    done();
                  }
                }

                client1.on('update', function(update) {
                  expect(update).to.exist;
                  replies++;
                  finish();
                });

                client2.on('update', function(update) {
                  expect(update).to.exist;
                  replies++;
                  finish();
                });

                setTimeout(function() {
                  testbot1_1.say('#test1', "!champ: alistar");
                }, 1000);
              });
            });
          });
        });
      });
    });
  });
  xit('#3 should not let clients hear messages from other chat rooms', function(done) {
    var client1 = io.connect(socketURL, options);
    client1.on('connect', function() {
      client1.on('confirmConnection', function() {
        client1.emit('joinRoom', 'testStreamer');
        client1.on('joinRoom', function() {

          var client2 = io.connect(socketURL, options);
          client2.on('connect', function() {
            client2.on('confirmConnection', function() {
              client2.emit('joinRoom', 'otherStreamer');
              client2.on('joinRoom', function() {
                var replies = [];

                function finish() {
                  if (replies.length === 2) {
                    expect(replies).to.include("!champ: alistar");
                    expect(replies).to.include("!champ: kalista");
                    testbot1_1.part('#test1');
                    testbot2_1.part('#test1');
                    client1.removeAllListeners();
                    client2.removeAllListeners();
                    done();
                  }
                }

                client1.on('update', function(update) {
                  expect(update).to.exist;
                  replies.push(update);
                  finish();
                });

                client2.on('update', function(update) {
                  expect(update).to.exist;
                  replies.push(update);
                  finish();
                });

                setTimeout(function() {
                  testbot1_1.say('#test1', "!champ: alistar");
                  testbot2_2.say('#test2', "!champ: kalista");
                }, 1000);
              });
            });
          });
        });
      });
    });
  });
  it('#4 should work with other rooms', function(done) {
    var client1 = io.connect(socketURL, options);
    client1.on('connect', function() {
      client1.on('confirmConnection', function() {
        client1.emit('joinRoom', 'testStreamer');
        client1.on('joinRoom', function() {

          var client2 = io.connect(socketURL, options);
          client2.on('connect', function() {
            client2.on('confirmConnection', function() {
              client2.emit('joinRoom', 'otherStreamer');
              client2.on('joinRoom', function() {
                var streamer1 = io.connect(socketURL, options);
                streamer1.emit('openVoting', {
                  streamer: 'testStreamer',
                  channel: '#test1'
                });
                streamer1.on('openVoting', function() {
                  var streamer2 = io.connect(socketURL, options);
                  streamer2.emit('openVoting', {
                    streamer: 'otherStreamer',
                    channel: '#test2'
                  });
                  streamer2.on('openVoting', function() {
                    var replies = [];

                    function finish() {
                      if (replies.length === 2) {
                        expect(replies).to.include("!champ: alistar");
                        expect(replies).to.include("!champ: kalista");
                        // testbot1_1.part('#test1');
                        // testbot2_1.part('#test1');
                        client1.removeAllListeners();
                        client2.removeAllListeners();
                        done();
                      }
                    }

                    client1.on('update', function(update) {
                      expect(update).to.exist;
                      replies.push(update);
                      finish();
                    });

                    client2.on('update', function(update) {
                      expect(update).to.exist;
                      replies.push(update);
                      finish();
                    });

                    setTimeout(function() {
                      testbot1_1.say('#test1', "!champ: alistar");
                      testbot2_2.say('#test2', "!champ: kalista");
                    }, 1000);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
