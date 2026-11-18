import test from 'node:test';
import assert from 'node:assert/strict';
import {startggStreamURL,startggToItems,isMajorStartgg} from '../scripts/collectors/startgg.mjs';

test('startggStreamURL builds platform URLs and skips unknown sources',()=>{
 assert.deepEqual(startggStreamURL({streamName:'SuperAkouma',streamSource:'TWITCH'}),{platform:'Twitch',url:'https://www.twitch.tv/superakouma'});
 assert.deepEqual(startggStreamURL({streamName:'FGC FR',streamSource:'YOUTUBE'}),{platform:'YouTube',url:'https://www.youtube.com/@FGCFR'});
 assert.deepEqual(startggStreamURL({streamName:'x',streamSource:'MIXER'}),null);
 assert.equal(startggStreamURL({streamName:'',streamSource:'TWITCH'}),null);
});

test('startggToItems keeps dated tournaments with stream and game info',()=>{
 const items=startggToItems([
  {id:966356,name:'Le Smash Blésois X',slug:'tournament/le-smash',startAt:1792933200,endAt:1792947600,city:'Villebarou',numAttendees:64,events:[{name:'Ultimate Singles',startAt:1792933200,videogame:{displayName:'Ultimate'}}],streams:[{streamName:'superakouma',streamSource:'TWITCH'}]},
  {id:null,name:'bad',startAt:null},
  {id:1,name:'No date',slug:'tournament/nope',startAt:null}
 ]);
 assert.equal(items.length,1);
 assert.equal(items[0].key,'sg-966356');
 assert.equal(items[0].game,'Super Smash Bros. Ultimate');
 assert.equal(items[0].streams[0].platform,'Twitch');
 assert.equal(items[0].end,new Date(1792947600*1000).toISOString());
 assert.equal(items[0].attendees,64);
});

test('les weeklies et sessions locales restent hors catalogue',()=>{
 assert.equal(isMajorStartgg({title:'Saucismash[NG+] #283 - Ultimate Weekly Lyon'}),false);
 assert.equal(isMajorStartgg({title:'Fullmoon Arena #3 : Smash Ultimate'}),false);
 assert.equal(isMajorStartgg({title:'La Mine #5'}),false);
 assert.equal(isMajorStartgg({title:'Smash Downtown #140 - Smash à Lez x Burnout'}),false);
 assert.equal(isMajorStartgg({title:'D3mon Day : Smash Ultimate'}),false);
 assert.equal(isMajorStartgg({title:'DGF 2026'}),false);
});

test('l’envergure passe par le nombre d’inscrits ou un intitulé explicite',()=>{
 assert.equal(isMajorStartgg({title:'Sector Z National'}),true);
 assert.equal(isMajorStartgg({title:'Random Local Bracket'}),false);
 assert.equal(isMajorStartgg({title:'Tournoi du dimanche',attendees:64}),true);
 assert.equal(isMajorStartgg({title:'Practice Night',attendees:120}),false);
 assert.equal(isMajorStartgg({title:'InterGalactic Championship 2026'}),true);
 assert.equal(isMajorStartgg({title:'Weekly Cup',attendees:200}),false);
 assert.equal(isMajorStartgg({title:''}),false);
});
