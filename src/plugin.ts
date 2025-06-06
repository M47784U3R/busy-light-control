import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { BusyLightCrontrol } from "./actions/busy-light-control";

streamDeck.logger.setLevel(LogLevel.DEBUG);

streamDeck.actions.registerAction(new BusyLightCrontrol());

streamDeck.connect();
