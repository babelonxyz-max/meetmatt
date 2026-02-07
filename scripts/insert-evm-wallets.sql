-- Insert 5 HyperEVM burner wallets into WalletPool
-- Run this in your database after funding the wallets with HYPE

INSERT INTO "WalletPool" ("id", "publicKey", "privateKey", "isAvailable", "createdAt", "updatedAt") VALUES
('wallet_1', '0x80ED6c78c12Eef9260bEA59DDCC449Bb1BA4C251', '0x162a858745b4c652988d82f1be1829d1988dce1e5158ccab784c0c57982f7a22', true, NOW(), NOW()),
('wallet_2', '0x697Fc23A473dEE565EA9B9B84a40aC31e1B1a340', '0xab76b23046eedd247cc27aa74dc999be6aeb92c19e0af09dc18296768739805e', true, NOW(), NOW()),
('wallet_3', '0x8103BbeAa865855dc729112fac645e5BAa6bF8D9', '0xbb07c19a703702893da3df5d837a4af2115ac3fe53b8b40437fef84a67b07ece', true, NOW(), NOW()),
('wallet_4', '0x88675469Fcf3b77e01BfBD1f244E283a8BeA9150', '0x94ed47245ff7a20b6f09c8ce034f79ec57d9d5af62db2ba11ad2484834ff29af', true, NOW(), NOW()),
('wallet_5', '0xc59F32f36a9AFE50Ae55986ab010693965d21b85', '0xbbbcab499ec4c2b51b6ab5508730dc655f0af531c99506f39bdd4df3262be0b8', true, NOW(), NOW());
