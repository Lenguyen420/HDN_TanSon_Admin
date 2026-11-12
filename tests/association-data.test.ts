import test from "node:test";
import assert from "node:assert/strict";
import { createQueryCache } from "../services/query-cache.ts";
import axios from "../services/api/axiosConfig.ts";
import { loadAssociationData } from "../services/association-data.ts";
import { saveRecord, removeRecord } from "../services/association-api.ts";

test("query cache shares requests, expires, and preserves mutations against an older GET", async () => {
  const cache = createQueryCache<string, string[]>(0);
  let done!: (value: string[]) => void;
  let requests = 0;
  const loader = () => {
    requests++;
    return new Promise<string[]>((resolve) => {
      done = resolve;
    });
  };
  const first = cache.get("news", loader);
  const duplicate = cache.get("news", loader);
  assert.equal(requests, 1);
  cache.update("news", () => ["saved"]);
  done(["old"]);
  assert.deepEqual(await first, ["saved"]);
  assert.deepEqual(await duplicate, ["saved"]);
  await cache.get("news", async () => {
    requests++;
    return ["fresh"];
  });
  assert.equal(requests, 2);
});

test("admin loads only requested collection and updates CRUD without reloading lists", async () => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: { getItem: () => null } },
  });
  const requests: { method: string; url: string }[] = [];
  axios.defaults.adapter = async (config) => {
    requests.push({ method: config.method!, url: config.url! });
    const payload =
      config.method === "get"
        ? {
            data: [{ id: "b1", alt: "Before", order: 1 }],
            pagination: { total: 1 },
          }
        : config.method === "delete"
          ? { success: true }
          : {
              data: {
                ...JSON.parse(config.data),
                id: "b1",
                updatedAt: "server-time",
              },
            };
    return {
      data: payload,
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  await loadAssociationData(["banners"]);
  await loadAssociationData(["banners"]);
  await saveRecord("banners", {
    id: "b1",
    alt: "Saved",
    image: "/test.webp",
    order: 2,
    status: "active",
  });
  const updated = await loadAssociationData(["banners"]);
  assert.equal(updated.collections.banners[0].alt, "Saved");
  assert.equal(updated.collections.banners[0].updatedAt, "server-time");
  await removeRecord("banners", "b1");
  assert.equal(
    (await loadAssociationData(["banners"])).collections.banners.length,
    0,
  );
  assert.deepEqual(requests, [
    { method: "get", url: "/association/banners" },
    { method: "put", url: "/association/banners/b1" },
    { method: "delete", url: "/association/banners/b1" },
  ]);
});


test("member portrait URLs are preserved in admin create/update payloads and can be cleared", async () => {
  const sent: unknown[] = [];
  axios.defaults.adapter = async (config) => {
    const body = JSON.parse(config.data); sent.push(body.avatar);
    return {data:{data:{...body,id:"portrait-member"}},status:200,statusText:"OK",headers:{},config};
  };
  await saveRecord("members", {id:"portrait-member",name:"Hội viên",company:"Công ty",avatar:"https://example.com/photo.jpg"});
  await saveRecord("members", {id:"portrait-member",name:"Hội viên",company:"Công ty",avatar:""}, true);
  assert.deepEqual(sent,["https://example.com/photo.jpg",""]);
});

test("company founding date is retained in registration and member saves", async () => {
  const sent: string[] = [];
  axios.defaults.adapter = async config => {
    const body = JSON.parse(config.data); sent.push(body.companyFoundedAt);
    return {data:{data:{...body,id:"founded-member"}},status:200,statusText:"OK",headers:{},config};
  };
  await saveRecord("members", {id:"founded-member",name:"Hội viên",company:"Doanh nghiệp",joinedAt:"2026-11-12",companyFoundedAt:"2010-05-20"});
  await saveRecord("registrations", {id:"founded-registration",fullName:"Hội viên",company:"Doanh nghiệp",phone:"0900000001",date:"2026-11-12",companyFoundedAt:"2010-05-20"});
  assert.deepEqual(sent,["2010-05-20","2010-05-20"]);
});
