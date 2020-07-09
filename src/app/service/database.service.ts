import { Platform } from '@ionic/angular';
import { Injectable } from '@angular/core';
import { SQLitePorter } from '@ionic-native/sqlite-porter/ngx';
import { HttpClient } from '@angular/common/http';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite/ngx';
import { BehaviorSubject, Observable } from 'rxjs';
 
@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private database: SQLiteObject;
  private dbReady: BehaviorSubject<boolean> = new BehaviorSubject(false);
 
  user_key_pairs = new BehaviorSubject([]);
  whisper_events = new BehaviorSubject([]);
  private_encounter_tokens = new BehaviorSubject([]);
  ble_connect_events = new BehaviorSubject([]);
  ble_ping_events = new BehaviorSubject([]);
 
  constructor(private plt: Platform, private sqlitePorter: SQLitePorter, private sqlite: SQLite, private http: HttpClient) {
    this.plt.ready().then(() => {
      console.log('Junior');
      this.sqlite.create({
        name: 'daan-covid19.db',
        location: 'default'
      })
      .then((db: SQLiteObject) => {
          console.log('Jr');
          this.database = db;
          this.seedDatabase();
      });
    });
  }
 
  seedDatabase() {
    this.http.get('assets/seed.sql', { responseType: 'text'})
    .subscribe(sql => {
      this.sqlitePorter.importSqlToDb(this.database, sql)
        .then(_ => {
          this.dbReady.next(true);
        })
        .catch(e => console.error(e));
    });
  }

  getRecordFromAnyTable(table_name: String, record_id: Number){
    return this.database.executeSql('SELECT * FROM ? WHERE id = ? LIMIT 1', [table_name, record_id]).then(data => {
      return data;
    });
  }

  /** UserKeyPairs queries */
  addKeypair(pri_key: String, pub_key: String, time_reference: Number, expiry_after_sec: Number){
    let data = [pri_key, pub_key, time_reference, expiry_after_sec];
    return this.database.executeSql('INSERT INTO user_key_pairs (private_key, public_key, time_reference, expiry_after_sec) VALUES (?, ?, ?, ?)', data).then((data: any) => {
      //return created keys
      return data
    });
  }

  getAllUserKeyPairs(){
    return this.database.executeSql('SELECT * FROM user_key_pairs ORDER BY time_reference DESC', []).then(data => {
      let userkeyPairs = [];
 
      if (data.rows.length > 0) {
        for (var i = 0; i < data.rows.length; i++) {
          userkeyPairs.push({ 
            id: data.rows.item(i).id,
            private_key: data.rows.item(i).private_key, 
            public_key: data.rows.item(i).public_key, 
            time_reference: data.rows.item(i).time_reference,
            expiry_after_sec: data.rows.item(i).expiry_after_sec
           });
        }
      }
      this.user_key_pairs.next(userkeyPairs);
    });
  }

  getLastUserKeyPair(){
    return this.database.executeSql('SELECT * FROM user_key_pairs ORDER BY time_reference DESC LIMIT 1', []).then(data => {
      if(data.rows.length > 0){
        return {
          id: data.rows.item(0).id,
          private_key: data.rows.item(0).private_key, 
          public_key: data.rows.item(0).public_key, 
          time_reference: data.rows.item(0).time_reference,
          expiry_after_sec: data.rows.item(0).expiry_after_sec
        }
      }
      else{
        return null;
      }
    });
  }

  getUserKeyPairbyTimeReference(time: Number){
    return this.database.executeSql('SELECT * FROM user_key_pairs WHERE time_reference <= ? AND (time_reference + (expiry_after_sec * 1000)) >= ? ORDER BY time_reference DESC', [time, time]).then(data => {
      let userkeyPairs = [];
 
      if (data.rows.length > 0) {
        for (var i = 0; i < data.rows.length; i++) {
          userkeyPairs.push({ 
            id: data.rows.item(i).id,
            private_key: data.rows.item(i).private_key, 
            public_key: data.rows.item(i).public_key, 
            time_reference: data.rows.item(i).time_reference,
            expiry_after_sec: data.rows.item(i).expiry_after_sec
           });
        }
      }
      return userkeyPairs;
    });

  }

  /** WhisperEvents queries */
  addWhisperEvent(timestamp: Number, code: Number, int1: Number, int2: Number, str1: String){
    let data = [timestamp, code, int1, int2, str1];
    return this.database.executeSql('INSERT INTO whisper_events (timestamp, code, int1, int2, str1) VALUES (?, ?, ?, ?, ?)', data).then(data => {
      //this.getAllWhisperEvents();
      return data;
    });
  }
  /** TODO: define method for getting Event between two periods (timestamps) */

  getWispherEventByPeriod(start_period: Number, end_period: Number){
    return this.database.executeSql('SELECT * FROM whisper_events WHERE  timestamp >= ? AND timestamp <= ?', [start_period, end_period]).then(data => {
      let whisperEvents = [];
 
      if (data.rows.length > 0) {
        for (var i = 0; i < data.rows.length; i++) {
          whisperEvents.push({ 
            id: data.rows.item(i).id,
            timestamp: data.rows.item(i).timestamp, 
            code: data.rows.item(i).code, 
            int1: data.rows.item(i).int1,
            int2: data.rows.item(i).int2,
            str1: data.rows.item(i).str1
           });
        }
      }
      return whisperEvents;
    });
  }

  getAllWhisperEvents(){
    return this.database.executeSql('SELECT * FROM whisper_events', []).then(data => {
      let whisperEvents = [];
 
      if (data.rows.length > 0) {
        for (var i = 0; i < data.rows.length; i++) {
          whisperEvents.push({ 
            id: data.rows.item(i).id,
            timestamp: data.rows.item(i).timestamp, 
            code: data.rows.item(i).code, 
            int1: data.rows.item(i).int1,
            int2: data.rows.item(i).int2,
            str1: data.rows.item(i).str1
           });
        }
      }
      this.whisper_events.next(whisperEvents);
    });
  }

  deleteWhisperEvent(olderThan: Number){
    return this.database.executeSql('DELETE FROM whisper_events WHERE timestamp < ?', [olderThan]).then(_ => {
      this.getAllWhisperEvents();
    });
  }

  /** BleConnectEvents queries */
  addBleConnectEvent(initiator: number, peripheral_hash: string, connect_time_ms: number, organization: number, adv_v: number, adv_pubkey: string, rssi: number, pet_id: number){
    let data = [initiator, peripheral_hash, connect_time_ms, adv_v, adv_pubkey, rssi, pet_id];
    return this.database.executeSql('INSERT INTO ble_connect_events (initiator, peripheral_hash, connect_time_ms, adv_v, adv_pubkey, rssi, private_encounter_token_id) VALUES (?, ?, ?, ?, ?, ?, ?)', data).then((data: any) => {
      //return item recorded
      return data;
    });
  }

  getAllBleConnectEvents(){
    return this.database.executeSql('SELECT * FROM ble_connect_events', []).then(data => {
      let bleConnectEvents = [];
 
      if (data.rows.length > 0) {
        for (var i = 0; i < data.rows.length; i++) {
          bleConnectEvents.push({ 
            id: data.rows.item(i).id,
            initiator: data.rows.item(i).initiator, 
            peripheral_hash: data.rows.item(i).peripheral_hash, 
            connect_time_ms: data.rows.item(i).connect_time_ms,
            organization: data.rows.item(i).organization,
            adv_v: data.rows.item(i).adv_v,
            adv_pubkey: data.rows.item(i).adv_pubkey,
            rssi: data.rows.item(i).rssi,
            private_encounter_token_id: data.rows.item(i).private_encounter_token_id
           });
        }
      }
      this.ble_connect_events.next(bleConnectEvents);
    });
  }

  getAllBleConnectEventSince(time: Number){
    return this.database.executeSql('SELECT * FROM ble_connect_events WHERE connect_time_ms > ? ORDER BY connect_time_ms DESC', [time]).then(data => {
      let bleConnectEvents = [];
 
      if (data.rows.length > 0) {
        for (var i = 0; i < data.rows.length; i++) {
          bleConnectEvents.push({ 
            id: data.rows.item(i).id,
            initiator: data.rows.item(i).initiator, 
            peripheral_hash: data.rows.item(i).peripheral_hash, 
            connect_time_ms: data.rows.item(i).connect_time_ms,
            adv_v: data.rows.item(i).adv_v,
            adv_pubkey: data.rows.item(i).adv_pubkey,
            rssi: data.rows.item(i).rssi,
            private_encounter_token_id: data.rows.item(i).private_encounter_token_id
           });
        }
      }
      return bleConnectEvents;
      //this.ble_connect_events.next(bleConnectEvents);
    });
  }

  getLastConnect(peripheralHash: string){
    return this.database.executeSql('SELECT * FROM ble_connect_events WHERE peripheral_hash = ? ORDER BY connect_time_ms DESC LIMIT 1', [peripheralHash]).then(data => {
      if (data.rows.length > 0){
        return {
          id: data.rows.item(0).id,
          initiator: data.rows.item(0).initiator, 
          peripheral_hash: data.rows.item(0).peripheral_hash, 
          connect_time_ms: data.rows.item(0).connect_time_ms,
          adv_v: data.rows.item(0).adv_v,
          adv_pubkey: data.rows.item(0).adv_pubkey,
          rssi: data.rows.item(0).rssi,
          private_encounter_token_id: data.rows.item(0).private_encounter_token_id
    }
      }
      else{
        return null;
      } 
    });
  }

  /** BlePingEvents queries */
  addBlePingEvent(ping_timestamp_ms:number, rssi: number, elapsed_time_duration: number, pet_id: number){
    let data = [ping_timestamp_ms, rssi, elapsed_time_duration, pet_id];
    return this.database.executeSql('INSERT INTO ble_ping_events (ping_timestamp_ms, rssi, elapsed_time_duration, private_encounter_token_id) VALUES (?, ?, ?, ?)', data).then((data: any) => {
      // return recorded item
      return data;
    });
  }

  getAllBlePingEvents(){
    return this.database.executeSql('SELECT * FROM ble_ping_events', []).then(data => {
      let blePingEvents = [];
 
      if (data.rows.length > 0) {
        for (var i = 0; i < data.rows.length; i++) {
          blePingEvents.push({ 
            id: data.rows.item(i).id,
            ping_timestamp_ms: data.rows.item(i).ping_timestamp_ms, 
            rssi: data.rows.item(i).rssi, 
            elapsed_time_duration: data.rows.item(i).elapsed_time_duration,
            private_encounter_token_id: data.rows.item(i).private_encounter_token_id
           });
        }
      }
      this.ble_ping_events.next(blePingEvents);
    });
  }

  getLastPing(petRowId: number){
    return this.database.executeSql('SELECT * FROM ble_ping_events WHERE private_encounter_token_id = ? ORDER BY ping_timestamp_ms DESC LIMIT 1', [petRowId]).then(data => {
      if(data.rows.length > 0){
        return {
          id: data.rows.item(0).id,
          ping_timestamp_ms: data.rows.item(0).ping_timestamp_ms, 
          rssi: data.rows.item(0).rssi, 
          elapsed_time_duration: data.rows.item(0).elapsed_time_duration,
          private_encounter_token_id: data.rows.item(0).private_encounter_token_id
        }
      }
      else{
        return null;
      }
    });
  }

  /** PrivateEncounterTokens queries */
  addPrivateEncounterToken(tell_token: string, hear_token: string, geo_hash: string, last_seen: number, shared: number, tag: string){
    let data = [tell_token, hear_token, geo_hash, last_seen, shared, tag];
    return this.database.executeSql('INSERT INTO private_encounter_tokens (tell_token, hear_token, geo_hash, last_seen, shared, tag) VALUES (?, ?, ?, ?, ?, ?)', data).then((data:any) => {
      //this.getAllBleConnectEvents();
      return data;
    });
  }

  getAllPrivateEncounterTokens(){
    return this.database.executeSql('SELECT * FROM private_encounter_tokens ORDER BY last_seen', []).then(data => {
      let privateEncounterTokens = [];
 
      if (data.rows.length > 0) {
        for (var i = 0; i < data.rows.length; i++) {
          privateEncounterTokens.push({ 
            id: data.rows.item(i).id,
            tell_token: data.rows.item(i).tell_token, 
            hear_token: data.rows.item(i).hear_token, 
            geo_hash: data.rows.item(i).geo_hash,
            last_seen: data.rows.item(i).last_seen,
            shared: data.rows.item(i).shared,
            tag: data.rows.item(i).tag
           });
        }
      }
      this.private_encounter_tokens.next(privateEncounterTokens);
    });
  }

  getAllPrivateEncounterTokenSince(timeEpochMillis: Number){
    return this.database.executeSql('SELECT * FROM private_encounter_tokens WHERE last_seen >= ?', [timeEpochMillis]).then(data => {
      let privateEncounterTokens = [];
 
      if (data.rows.length > 0) {
        for (var i = 0; i < data.rows.length; i++) {
          privateEncounterTokens.push({ 
            id: data.rows.item(i).id,
            tell_token: data.rows.item(i).tell_token, 
            hear_token: data.rows.item(i).hear_token, 
            geo_hash: data.rows.item(i).geo_hash,
            last_seen: data.rows.item(i).last_seen,
            shared: data.rows.item(i).shared,
            tag: data.rows.item(i).tag
           });
        }
      }
      return privateEncounterTokens;
    });
  }

  getAllRemainingTellTokenSince(timeEpochMillis: Number){
    return this.database.executeSql('SELECT id, tell_token, geo_hash FROM private_encounter_tokens WHERE last_seen >= ? AND shared = 0 ORDER BY last_seen DESC', [timeEpochMillis]).then(data => {
      let privateEncounterTokens = [];
 
      if (data.rows.length > 0) {
        for (var i = 0; i < data.rows.length; i++) {
          privateEncounterTokens.push({ 
            id: data.rows.item(i).id,
            tell_token: data.rows.item(i).tell_token,
            geo_hash: data.rows.item(i).geo_hash
           });
        }
      }
      return privateEncounterTokens;
    });
  }

  getRemainingTellTokenSince(timeEpochMillis: Number, limit: Number){
    return this.database.executeSql('SELECT id, tell_token, geo_hash FROM private_encounter_tokens WHERE last_seen >= ? AND shared = 0 ORDER BY last_seen DESC LIMIT ?', [timeEpochMillis, limit]).then(data => {
      let privateEncounterTokens = [];
 
      if (data.rows.length > 0) {
        for (var i = 0; i < data.rows.length; i++) {
          privateEncounterTokens.push({ 
            id: data.rows.item(i).id,
            tell_token: data.rows.item(i).tell_token,
            geo_hash: data.rows.item(i).geo_hash
           });
        }
      }
      return privateEncounterTokens;
    });
  }
  /**TODO: define getHearToken by tell_token */

  getHearToken(tell_token: string){
    return this.database.executeSql('SELECT id, hear_token, geo_hash FROM private_encounter_tokens WHERE tell_token = ? LIMIT 1', [tell_token]).then(data => {
      if(data.rows.length > 0){
          return {
          id: data.rows.item(0).id,
          hear_token: data.rows.item(0).hear_token, 
          geo_hash: data.rows.item(0).geo_hash
        }
      }
      else{
        return null;
      }
    });
  }
  /**TODO: define getHearToken by tell_token list */
  getHearTokenByList(tell_tokens: Array<string>){
    return this.database.executeSql('SELECT id, hear_token, geo_hash FROM private_encounter_tokens WHERE tell_token IN ? ', [tell_tokens]).then(data => {
      let privateEncounterTokens = [];
 
      if (data.rows.length > 0) {
        for (var i = 0; i < data.rows.length; i++) {
          privateEncounterTokens.push({ 
            id: data.rows.item(i).id,
            hear_token: data.rows.item(i).hear_token, 
            geo_hash: data.rows.item(i).geo_hash
           });
        }
      }
      return privateEncounterTokens;
    });
  }

  getAllHearTokenSince(timeEpochMillis: Number){
    return this.database.executeSql('SELECT id, hear_token, geo_hash FROM private_encounter_tokens WHERE last_seen >= ? ', [timeEpochMillis]).then(data => {
      let privateEncounterTokens = [];
 
      if (data.rows.length > 0) {
        for (var i = 0; i < data.rows.length; i++) {
          privateEncounterTokens.push({ 
            id: data.rows.item(i).id,
            hear_token: data.rows.item(i).hear_token, 
            geo_hash: data.rows.item(i).geo_hash
           });
        }
      }
      return privateEncounterTokens;
    });
  }

  updateLastSeen(rowid: Number,  lastSeen: Number){
    return this.database.executeSql('UPDATE private_encounter_tokens SET last_seen = ? WHERE id = ?', [lastSeen, rowid]).then((data: any) => {
      return data;
    });
  }

  updateSharedStatus(telltoken: String, shared: Number){
    return this.database.executeSql('UPDATE private_encounter_tokens SET shared = ? WHERE tell_token = ?', [shared, telltoken]).then((data: any) => {
      return data;
    });
  }

  updateTag(heartoken: String, tag: String){
    return this.database.executeSql('UPDATE private_encounter_tokens SET tag = ? WHERE hear_token = ?', [tag, heartoken]).then((data: any) => {
      return data;
    });
  }

  deleteOldData(olderThan: Number){
    return this.database.executeSql('DELETE FROM private_encounter_tokens WHERE last_seen < ?', [olderThan]).then(_ => {
      this.getPrivateEncounterTokens();
    });
  }

  estimateRiskExposure(tag: String){
    return this.database.executeSql("SELECT COUNT(ping.elapsed_time_duration) FROM ble_ping_events ping " +
    "INNER JOIN private_encounter_tokens pet ON pet.id = ping.private_encounter_token_id " +
    "WHERE pet.tag = ?", [tag]).then(data => {
      return data;
    });
  }


 
  getDatabaseState() {
    return this.dbReady.asObservable();
  }

  getPrivateEncounterTokens(): Observable<any[]> {
    return this.private_encounter_tokens.asObservable();
  }
 
  /* getConnectEvents(): Observable<any[]> {
    return this.ble_connect_events.asObservable();
  }
 
  getPingEvents(): Observable<any[]> {
    return this.ble_ping_events.asObservable();
  } */
}