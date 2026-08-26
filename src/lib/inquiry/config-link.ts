/**
 * The contract for a configurator link.
 *
 * Its own module because both ends need it and they sit on opposite sides of the
 * server boundary: the configurator writes the link from a client component,
 * while `describeConfig` reads it on the server and imports the `server-only`
 * content layer to do so. Putting the constant beside the reader made the client
 * pull that whole layer in, which the build rejects outright.
 */

/**
 * Longest wording carried in a configurator link.
 *
 * Shared so the two ends cannot cap at different numbers. They did not agree
 * before: the link builder capped at 200 while the reader accepted whatever
 * arrived, so a hand-edited or forwarded URL carrying 5000 characters of `text`
 * prefilled all 5000 into the message field — past the 4000 the schema allows,
 * leaving a form that could not be submitted until the visitor deleted a thousand
 * characters by hand. The sibling `plan` parameter had been capped all along,
 * which is what made the omission visible.
 */
export const MAX_CONFIG_TEXT = 200;
