import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { NumberToWord } from '../utils/song/NumberToWord';
import { NativeAudio } from '@ionic-native/native-audio/ngx';

@Component({
  selector: 'app-tab5',
  templateUrl: 'tab5.page.html',
  styleUrls: ['tab5.page.scss']
})
export class Tab5Page {

  private audioPath = 'assets/units-wo/';
  private number = 123456;
  private numberToWord: NumberToWord = new NumberToWord();
  constructor(private platform: Platform,
    private nativeAudio: NativeAudio) {
  }

  ngOnInit() {

    // The Native Audio plugin can only be called once the platform is ready
    this.platform.ready().then(() => {
      console.log("platform ready");


      this.nativeAudio.preloadComplex('séro', this.audioPath + '0.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('bénn', this.audioPath + '1.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('gnaar', this.audioPath + '2.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('gnett', this.audioPath + '3.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('gneent', this.audioPath + '4.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('diouróom', this.audioPath + '5.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('diouróom-bénn', this.audioPath + '6.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('diouróom-gnaar', this.audioPath + '7.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('diouróom-gnett', this.audioPath + '8.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('diouróom-gnéent', this.audioPath + '9.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('fouk', this.audioPath + '10.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('fanwéer', this.audioPath + '30.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('téeméer', this.audioPath + '100.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('diounni', this.audioPath + '1000.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('tamndaréet', this.audioPath + 'tamndaréet.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('tamgnaréet', this.audioPath + 'tamgnaréet.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });

      this.nativeAudio.preloadComplex('ak', this.audioPath + 'ak.m4a', 1, 1, 0).then(function () {
      }, function (err) { console.log("audio failed: " + err); });


    });



  }

  playOne(track: string): Promise<void> {
    return new Promise(resolve => this.nativeAudio.play(track, resolve));
  }
  
  playAudio(): void {
    let tracks: string[] = this.numberToWord.numberToWolof(this.number).split(" ");
    let player = (acc, track) => acc.then(() => this.playOne(track));
    tracks.reduce(player, Promise.resolve());
  }



}
