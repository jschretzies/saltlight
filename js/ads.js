// The one place adverts live. Rule: an advert is shown only when the player
// asks for a hint, nowhere else.
//
// Today there is no advert network connected, so rewarded() says yes at once.
// When the game is wrapped for the app stores, this function shows a rewarded
// advert (AdMob) and resolves true only if the player watched it to the end.

export const Ads = {
  connected: false,

  async rewarded(reason) {
    return true;
  },
};
