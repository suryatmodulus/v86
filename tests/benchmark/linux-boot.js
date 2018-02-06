#!/usr/bin/env node
"use strict";

var V86 = require("../../build/libv86.js").V86;
var fs = require("fs");
const LOG_SERIAL = false;

var emulator = new V86({
    bios: { url: __dirname + "/../../bios/seabios.bin" },
    vga_bios: { url: __dirname + "/../../bios/vgabios.bin" },
    cdrom: { url: __dirname + "/../../images/linux3.iso" },
    autostart: true,
    memory_size: 32 * 1024 * 1024,
});

emulator.bus.register("emulator-started", function()
{
    console.error("Booting now, please stand by");
    start_time = Date.now();
});

var line = "";
var start_time;

emulator.add_listener("serial0-output-char", function(chr)
{
    if(chr < " " && chr !== "\n" && chr !== "\t" || chr > "~")
    {
        return;
    }

    if(chr === "\n")
    {
        if(LOG_SERIAL) console.error("Serial: %s", line);
        line = "";
    }
    else
    {
        line += chr;
    }

    if(line.endsWith("~% "))
    {
        const end_time = Date.now();
        const elapsed = end_time - start_time;
        console.log("Done in %dms", elapsed);
        emulator.stop();

        const cpu = emulator.v86.cpu;
        const names = [
            "IDLE",
            "DO_MANY_CYCLES",
            "GEN_INSTR",
            "RUN_FROM_CACHE",
            "RUN_INTERPRETED",
        ];
        const stat_names = [
            "COMPILE",
            "COMPILE_SUCCESS",
            "RUN_INTERPRETED",
            "RUN_FROM_CACHE",
            "CACHE_MISMATCH",
            "CACHE_DROP",
            "CACHE_SKIPPED",
            "COMPILE_WITH_LINK",
        ];
        const total = cpu.wm.exports["_profiler_get_total"]();
        let text = "";

        if(!total)
        {
            console.error("Warning: No elapsed time measured, did you set ENABLE_PROFILER?");
        }

        for(let i = 0; i < names.length; i++)
        {
            let stat = cpu.wm.exports["_profiler_get_time"](i) / total;
            text += names[i] + "=" + stat.toFixed(2) + " ";
        }

        text += "\n";

        for(let i = 0; i < stat_names.length; i++)
        {
            let stat = cpu.wm.exports["_profiler_stat_get"](i);
            stat = stat > 9999 ? Math.round(stat / 1000) + "k" : stat;
            text += stat_names[i] + "=" + stat + " ";
        }

        console.log(text);
    }
});
