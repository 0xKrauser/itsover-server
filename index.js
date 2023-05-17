require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const keccak256 = require("keccak256");
const port = process.env.PORT || 3042;

app.use(cors());
app.use(express.json());

const sdk = require("api")("@reservoirprotocol/v3.0#36vtrdr1z8lhhl0zsv");

sdk.auth(process.env.RESERVOIR_API_KEY);

const checks = [
	"0x5Af0D9827E0c53E4799BB226655A1de152A425a5", // Milady
	"0xd3d9ddd0cf0a5f0bfb8f7fceae075df687eaebab", // Remilios
];

const contracts = [
	"0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d", // Bored Ape Yacht Club
	"0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03", // Nouns
	"0xed5af388653567af2f388e6224dc7c4b3241c544", // Azuki
	"0x60e4d786628fea6478f785a6d7e704777c86a7c6", // Mutant Ape Yacht Club
	"0x769272677fab02575e84945f03eca517acc544cc", // The Captainz
	"0x8821bee2ba0df28761afff119d66390d594cd280", // deGods
	"0xbd3531da5cf5857e7cfaa92426877b022e612cf8", // Pudgy Penguins
	"0xba30e5f9bb24caa003e9f2f0497ad287fdf95623", // Bored Ape Kennel Club
	"0xd1258db6ac08eb0e625b75b371c023da478e94a9", // DigiDaigaku
	"0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b", // Clone X
	"0x8a90cab2b38dba80c64b7734e58ee1db38b8992e", // Doodles
	"0xe785e82358879f061bc3dcac6f0444462d4b5330", // World of women
	"0x1a92f7381b9f03921564a437210bb9396471050c", // Cool Cats
	"0x364c828ee171616a39897688a831c2499ad972ec", // Sappy Seals
];

const timeout = 60_000; // 1 minute

const custom_search_timeout = 600_000; // 10 minutes

let lastTimestamp = 0;

const customTimestamps = {};

let data = [];

app.get("/data", async (req, res) => {
	if (Date.now() - lastTimestamp > timeout) {
		const { data: newData } = await sdk
			.getCollectionsV5({
				contract: [...checks, ...contracts],
				accept: "*/*",
			})
			.catch((e) => {
				res.status(500).send(e);
			});

		lastTimestamp = Date.now();

		data = newData.collections;

		res.status(200).send(newData.collections);
	} else {
		res.status(200).send(data);
	}
});

app.post("/custom", async (req, res, next) => {
	try {
		const { custom } = req.body;
		const hash = keccak256(custom.join("_")).toString("hex");
		if (Date.now() - (customTimestamps[hash] || 0) > custom_search_timeout) {
			const { data: customData } = await sdk
				.getCollectionsV5({
					contract: [...custom],
					accept: "*/*",
				})
				.catch((e) => {
					next(e);
					res.status(505).send(e);
				});

			customTimestamps[hash] = Date.now();

			res.status(200).send(customData.collections);
		} else {
			res.status(429).send("Timeout");
		}
	} catch (e) {
		next(e);
		res.status(500).send(e);
	}
});

app.listen(port, () => {
	console.log(`Listening on port ${port}!`);
});
