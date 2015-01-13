var Set = require('es6-set');
var animate = require('app/util/animate');

module.exports = (function() {
  'use strict';

  const FADE_OUT_DURATION = 0.5;
  const FADE_IN_DURATION = 1.0;
  const MUTE_LEVEL = 0.2;

  /**
   * A single channel.
   * @constructor
   * @param {Object} audioContext - The Web Audio context.
   * @param {GainNode} gainNode - The final output of all channels.
   */
  function Channel(audioContext, gainNode) {
    var output = audioContext.createGain();
    output.connect(gainNode);

    var analyser = audioContext.createAnalyser();
    analyser.connect(output);

    this.output = output;
    this.analyser = analyser;
    this.target = analyser;
    this.muted = true;

    this.setVolume = function(v) {
      output.gain.value = v;
    };
  }

  /**
   * The channel manager keeps track of different named channels
   * which an instrument can connect to. This allows per-instrument
   * volume tweening and audio analysis.
   *
   * @constructor
   * @param {AudioContext} audioContext - The main audio context.
   * @param {GainNode} gainNode - The final output of all channels.
   */
  return function ChannelManager(audioContext, gainNode) {
    var channels = new Set();

    /**
     * Create and register a new channel.
     * @return {Channel}
     */
    function create() {
      var chan = new Channel(audioContext, gainNode);
      channels.add(chan);

      unmute(chan);

      return chan;
    }

    /**
     * Mute a channel. Optionally fade the volume down.
     * @param {Channel} chan - The channel.
     * @param {number} duration - The fade duration.
     */
    function mute(chan, duration) {
      if (!chan.muted) {
        duration = duration || FADE_OUT_DURATION;
        chan.muted = true;

        animate({ volume: 1 }, duration, {
          volume: MUTE_LEVEL,
          ease: Linear.easeNone,
          onUpdate: function() {
            chan.setVolume(this.target.volume);
          }
        });
      }
    }

    /**
     * Unmute a channel. Optionally fade the volume up.
     * @param {Channel} chan - The channel.
     * @param {number} duration - The fade duration.
     */
    function unmute(chan, duration) {
      if (chan.muted) {
        duration = duration || FADE_IN_DURATION;

        chan.setVolume(MUTE_LEVEL);
        chan.muted = false;

        animate({ volume: MUTE_LEVEL }, duration, {
          volume: 1,
          ease: Linear.easeNone,
          onUpdate: function() {
            chan.setVolume(this.target.volume);
          }
        });
      }
    }

    /**
     * Mute all channels, except one. Useful for "solo mode".
     * @param {Channel} exceptChan - The channel to allow through.
     * @param {number} duration - The fade duration.
     */
    function muteAllExcept(exceptChan, duration) {
      for (let chan of channels) {
        if (chan !== exceptChan) {
          mute(chan, duration);
        }
      }
    }

    /**
     * Unmute all channels, except one. Useful for "solo mode".
     * @param {Channel} exceptChan - The channel to allow through.
     * @param {number} duration - The fade duration.
     */
    function unmuteAllExcept(exceptChan, duration) {
      for (let chan of channels) {
        if (chan !== exceptChan) {
          unmute(chan, duration);
        }
      }
    }

    return {
      create,
      muteAllExcept,
      unmuteAllExcept
    };
  };
})();
