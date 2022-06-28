// *******
// Copyright (C) JSFOUR - All Rights Reserved
// You are not allowed to sell this script or re-upload it
// Visit my page at https://github.com/jonassvensson4
// Written by Jonas Svensson, July 2018
// *******

let QBCore = exports["qb-core"].GetCoreObject()

// Register server events
RegisterNetEvent('jsfour-atm:getUserData');
RegisterNetEvent('jsfour-atm:deposit');
RegisterNetEvent('jsfour-atm:withdraw');
RegisterNetEvent('jsfour-atm:transfer');
RegisterNetEvent('jsfour-atm:create');
RegisterNetEvent('jsfour-atm:changePincode');

// Get user info
onNet('jsfour-atm:getUserData', async ( data ) => {
    let player = source;
    let identifier = GetPlayerIdentifier(player);
    let money = {};
    let userInfo = {}

    let Player = QBCore.Functions.GetPlayer(player)
    money = {
        bank: Player.PlayerData.money.bank,
        cash: Player.PlayerData.money.cash
    }
    userInfo = {
        firstname: Player.PlayerData.charinfo.firstname,
        lastname: Player.PlayerData.charinfo.lastname,
    }
    identifier = Player.PlayerData.citizenid

    let account = await exports.oxmysql.single_async(
        'SELECT `account`, `pincode` FROM `jsfour_atm` WHERE `identifier` = @identifier', { 
        '@identifier': identifier
    });
    emitNet('jsfour-atm:callback', player, {
        firstname: userInfo.firstname,
        lastname: userInfo.lastname,
        account: account.account,
        pincode: account.pincode,
        money: money
    }, data.CallbackID);
});

// Deposit money
onNet('jsfour-atm:deposit', ( data ) => {
    let player = source;
    let amount = parseInt(data);
    let Player = QBCore.Functions.GetPlayer(player)
    if (Player.Functions.RemoveMoney("cash", amount)) {
        Player.Functions.AddMoney("bank", amount)
        emitNet("QBCore:Notify", player, "Successful!", "success")
    } else {
        emitNet("QBCore:Notify", player, "You don't have enough money!", "error")
    }
});

// Withdraw money
onNet('jsfour-atm:withdraw', ( data ) => {
    let player = source;
    let amount = parseInt(data);

    let Player = QBCore.Functions.GetPlayer(player);
    if (Player.Functions.RemoveMoney("bank", amount)) {
        Player.Functions.AddMoney("cash", amount)
        emitNet("QBCore:Notify", player, "Successful!", "success")
    } else {
        emitNet("QBCore:Notify", player, "You don't have enough money!", "error")
    }
});

// Transfer money
onNet('jsfour-atm:transfer', async ( data ) => {
    let player = source;

    let receiverId = await exports.oxmysql.single_async(
        'SELECT `identifier` FROM `jsfour_atm` WHERE `account` = @account', { 
        '@account': data.receiver
    });

    if ( identifier.length > 0 ) {
        let amount = parseInt(data.amount);

        let Receiver = QBCore.Functions.GetPlayerByCitizenId(receiverId)
        let Sender = QBCore.Functions.GetPlayer(player)
        if (Receiver) {
            if (Sender.Functions.RemoveMoney("bank", amount)) {
                Receiver.Functions.AddMoney("bank", amount)
                emitNet("QBCore:Notify", player, `You sent ${amount} to ${Receiver.PlayerData.charinfo.firstname} ${Receiver.PlayerData.charinfo.lastname}`, "success")
                emitNet("QBCore:Notify", player, `You received ${amount} from ${Sender.PlayerData.charinfo.firstname} ${Sender.PlayerData.charinfo.lastname}`, "success")
            }
        } else {
            emitNet("QBCore:Notify", player, `Player is offline`, "error")
        }
    }
});

// Create bank account
onNet('jsfour-atm:create', async ( data ) => {
    let player = source;
    let identifier = GetPlayerIdentifier(player);
    if (QBCore) { identifier = QBCore.Functions.GetPlayer(player).PlayerData.citizenid }
    let number = Math.floor(Math.random() * (999999999 - 111111111));
    let account_exists = await exports.oxmysql.query_async(
        'SELECT `account` FROM `jsfour_atm` WHERE `account` = @account', { 
        '@account': number
    })
    while (account_exists.length > 0) {
        number = Math.floor(Math.random() * (999999999 - 111111111));
        account_exists = await exports.oxmysql.query_async(
            'SELECT `account` FROM `jsfour_atm` WHERE `account` = @account', { 
            '@account': number
        })
    }
    exports.oxmysql.query(
        'SELECT `identifier` FROM `jsfour_atm` WHERE `identifier` = @identifier', { 
        '@identifier': identifier
    }, function(result) {
        if ( result.length === 0 ) {
            exports.oxmysql.insert(
                'INSERT INTO `jsfour_atm` (`identifier`, `account`) VALUES (@identifier, @account)', { 
                '@identifier': identifier,
                '@account': number
            });
        }
    });
});

// Change pincode
onNet('jsfour-atm:changePincode', async ( data ) => {
    let src = source
    let Player = QBCore.Functions.GetPlayer(src)
    let owner = await exports.oxmysql.scalar_async('SELECT identifier FROM `jsfour_atm` WHERE `account` = @account', {
        '@account': data.account
    })
    if (owner == Player.PlayerData.citizenid) {
        exports.oxmysql.update(
            'UPDATE `jsfour_atm` SET `pincode` = @pincode WHERE `account` = @account', {
            '@account': data.account,
            '@pincode': data.pincode
        });
    }
});
