import test from 'node:test';
import assert from 'node:assert/strict';
import {serviceIcon} from '../public/event-utils.mjs';
test('service icons accompany names through local assets, with safe generic fallbacks',()=>{
 assert.match(serviceIcon({platform:'Twitch',url:'https://www.twitch.tv/riotgames'}),/service-icon/);
 assert.match(serviceIcon({platform:'YouTube'}),/youtube/);
 assert.match(serviceIcon({platform:'TV'}),/aria-hidden="true"/);
 assert.doesNotMatch(serviceIcon({url:'https://unknown.example/'}),/src="https:/);
 assert.doesNotMatch(serviceIcon({url:'javascript:alert(1)',label:'<script>'}),/<script>|javascript:/);
});
