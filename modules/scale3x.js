/**
 * Rotsprite-JS -- A Rotsprite implementation in JavaScript
 * Copyright 2022 spuuntries, kek, Art Union Discord Org., and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const sharp = require("sharp");

async function scale3x(input) {
  const image = sharp(input),
    metadata = await image.metadata(),
    rawImage = await image.raw().toBuffer();

  if (rawImage.length < 9) {
    // If the image is too small, just bilinear scale it

    // Determine a good scale factor that gets the image to at least 9 pixels
    const scaleFactor = Math.ceil(Math.sqrt(9 / rawImage.length));

    // Scale the image
    rawImage = await image
      .resize({
        width: image.width * scaleFactor,
        height: image.height * scaleFactor,
        fit: "fill",
        kernel: "lanczos2",
      })
      .raw()
      .toBuffer();

    // Update the metadata
    metadata.width *= scaleFactor;
    metadata.height *= scaleFactor;
  }

  let ninePixels = [];
  for (let i = 0; i < rawImage.length; i += 9) {
    ninePixels.push(rawImage.slice(i, i + 9));
  }

  // For each 9x9 we compute a new 9x9 that conforms to the scale3x algorithm:
  /**
   * The central pixel E is expanded in 9 new pixels:
   * E0 = D == B && B != F && D != H ? D : E;
   * E2 = B == F && B != D && F != H ? F : E;
   * E3 = (D == B && B != F && D != H && E != G) || (D == H && D != B && H != F && E != A) ? D : E;
   * E4 = E
   * E5 = (B == F && B != D && F != H && E != I) || (H == F && D != H && B != F && E != C) ? F : E;
   * E6 = D == H && D != B && H != F ? D : E;
   * E7 = (D == H && D != B && H != F && E != I) || (H == F && D != H && B != F && E != G) ? H : E;
   * E8 = H == F && D != H && B != F ? F : E;
   * E1 = (D == B && B != F && D != H && E != C) || (B == F && B != D && F != H && E != A) ? B : E;
   */
  let newPixels = ninePixels.map((pixels) => {
    // prettier-ignore
    let [A, B, C, D, E, F, G, H, I] = pixels,
     E0, E1, E2, E3, E4, E5, E6, E7, E8;

    if (B != H && D != F) {
      E0 = D == B ? D : E;
      E1 = (D == B && E != C) || (B == F && E != A) ? B : E;
      E2 = B == F ? F : E;
      E3 = (D == B && E != G) || (D == H && E != A) ? D : E;
      E4 = E;
      E5 = (B == F && E != I) || (H == F && E != C) ? F : E;
      E6 = D == H ? D : E;
      E7 = (D == H && E != I) || (H == F && E != G) ? H : E;
      E8 = H == F ? F : E;
    } else {
      E0 = E;
      E1 = E;
      E2 = E;
      E3 = E;
      E4 = E;
      E5 = E;
      E6 = E;
      E7 = E;
      E8 = E;
    }

    return [E0, E1, E2, E3, E4, E5, E6, E7, E8];
  });

  // Convert the new pixels back into a buffer
  let newBuffer = Buffer.concat(newPixels.map((pixels) => Buffer.from(pixels)));

  // Turn the buffer into an image
  let newImage = sharp(newBuffer, {
    raw: {
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
    },
  });

  return newImage;
}

module.exports = scale3x;
