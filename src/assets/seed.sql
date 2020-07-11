CREATE TABLE IF NOT EXISTS user_key_pairs(id INTEGER PRIMARY KEY AUTOINCREMENT, private_key TEXT, public_key TEXT, time_reference INTEGER, expiry_after_sec INTEGER);

CREATE TABLE IF NOT EXISTS whisper_events(id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp INTEGER, code TEXT, int1 INTEGER, int2 INTEGER, str1 TEXT);

CREATE TABLE IF NOT EXISTS private_encounter_tokens(id INTEGER PRIMARY KEY AUTOINCREMENT, tell_token TEXT, hear_token TEXT, geo_hash TEXT, last_seen INTEGER, shared INTEGER, tag TEXT);

CREATE TABLE IF NOT EXISTS ble_connect_events(id INTEGER PRIMARY KEY AUTOINCREMENT, initiator INTEGER, peripheral_hash TEXT, connect_time_ms INTEGER, organization INTEGER, adv_v INTEGER, adv_pubkey TEXT, rssi INTEGER, private_encounter_token_id INTEGER NOT NULL,
                                              CONSTRAINT fk_private_encounter_tokens FOREIGN KEY (private_encounter_token_id) REFERENCES private_encounter_tokens(id)
                                              );

CREATE TABLE IF NOT EXISTS ble_ping_events(id INTEGER PRIMARY KEY AUTOINCREMENT, ping_timestamp_ms INTEGER, rssi INTEGER, elapsed_time_duration INTEGER, private_encounter_token_id INTEGER NOT NULL,
                                          CONSTRAINT fk_private_encounter_tokens FOREIGN KEY (private_encounter_token_id) REFERENCES private_encounter_tokens(id)
                                          );

