/*

  Basic GUI blocking jpeg encoder ported to JavaScript and optimized by 
  Andreas Ritter, www.bytestrom.eu, 11/2009.

  Example usage is given at the bottom of this file.

  -----------

  Copyright (c) 2008, Adobe Systems Incorporated
  All rights reserved.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are
  met:

  * Redistributions of source code must retain the above copyright notice,
    this list of conditions and the following disclaimer.

  * Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the
    documentation and/or other materials provided with the distribution.

  * Neither the name of Adobe Systems Incorporated nor the names of its
    contributors may be used to endorse or promote products derived from
    this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
  IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

function JPEGEncoder(quality) {
  var self = this;
    var fround = Math.round;
    var ffloor = Math.floor;
    var YTable = new Array(64);
    var UVTable = new Array(64);
    var fdtbl_Y = new Array(64);
    var fdtbl_UV = new Array(64);
    var YDC_HT;
    var UVDC_HT;
    var YAC_HT;
    var UVAC_HT;

    var bitcode = new Array(65535);
    var category = new Array(65535);
    var outputfDCTQuant = new Array(64);
    var DU = new Array(64);
    var byteout = [];
    var bytenew = 0;
    var bytepos = 7;

    var YDU = new Array(64);
    var UDU = new Array(64);
    var VDU = new Array(64);
    var clt = new Array(256);
    var RGB_YUV_TABLE = new Array(2048);
    var currentQuality;

    var ZigZag = [
             0, 1, 5, 6,14,15,27,28,
             2, 4, 7,13,16,26,29,42,
             3, 8,12,17,25,30,41,43,
             9,11,18,24,31,40,44,53,
            10,19,23,32,39,45,52,54,
            20,22,33,38,46,51,55,60,
            21,34,37,47,50,56,59,61,
            35,36,48,49,57,58,62,63
        ];

    var std_dc_luminance_nrcodes = [0,0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0];
    var std_dc_luminance_values = [0,1,2,3,4,5,6,7,8,9,10,11];
    var std_ac_luminance_nrcodes = [0,0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,0x7d];
    var std_ac_luminance_values = [
            0x01,0x02,0x03,0x00,0x04,0x11,0x05,0x12,
            0x21,0x31,0x41,0x06,0x13,0x51,0x61,0x07,
            0x22,0x71,0x14,0x32,0x81,0x91,0xa1,0x08,
            0x23,0x42,0xb1,0xc1,0x15,0x52,0xd1,0xf0,
            0x24,0x33,0x62,0x72,0x82,0x09,0x0a,0x16,
            0x17,0x18,0x19,0x1a,0x25,0x26,0x27,0x28,
            0x29,0x2a,0x34,0x35,0x36,0x37,0x38,0x39,
            0x3a,0x43,0x44,0x45,0x46,0x47,0x48,0x49,
            0x4a,0x53,0x54,0x55,0x56,0x57,0x58,0x59,
            0x5a,0x63,0x64,0x65,0x66,0x67,0x68,0x69,
            0x6a,0x73,0x74,0x75,0x76,0x77,0x78,0x79,
            0x7a,0x83,0x84,0x85,0x86,0x87,0x88,0x89,
            0x8a,0x92,0x93,0x94,0x95,0x96,0x97,0x98,
            0x99,0x9a,0xa2,0xa3,0xa4,0xa5,0xa6,0xa7,
            0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,0xb5,0xb6,
            0xb7,0xb8,0xb9,0xba,0xc2,0xc3,0xc4,0xc5,
            0xc6,0xc7,0xc8,0xc9,0xca,0xd2,0xd3,0xd4,
            0xd5,0xd6,0xd7,0xd8,0xd9,0xda,0xe1,0xe2,
            0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,0xea,
            0xf1,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,
            0xf9,0xfa
        ];

    var std_dc_chrominance_nrcodes = [0,0,3,1,1,1,1,1,1,1,1,1,0,0,0,0,0];
    var std_dc_chrominance_values = [0,1,2,3,4,5,6,7,8,9,10,11];
    var std_ac_chrominance_nrcodes = [0,0,2,1,2,4,4,3,4,7,5,4,4,0,1,2,0x77];
    var std_ac_chrominance_values = [
            0x00,0x01,0x02,0x03,0x11,0x04,0x05,0x21,
            0x31,0x06,0x12,0x41,0x51,0x07,0x61,0x71,
            0x13,0x22,0x32,0x81,0x08,0x14,0x42,0x91,
            0xa1,0xb1,0xc1,0x09,0x23,0x33,0x52,0xf0,
            0x15,0x62,0x72,0xd1,0x0a,0x16,0x24,0x34,
            0xe1,0x25,0xf1,0x17,0x18,0x19,0x1a,0x26,
            0x27,0x28,0x29,0x2a,0x35,0x36,0x37,0x38,
            0x39,0x3a,0x43,0x44,0x45,0x46,0x47,0x48,
            0x49,0x4a,0x53,0x54,0x55,0x56,0x57,0x58,
            0x59,0x5a,0x63,0x64,0x65,0x66,0x67,0x68,
            0x69,0x6a,0x73,0x74,0x75,0x76,0x77,0x78,
            0x79,0x7a,0x82,0x83,0x84,0x85,0x86,0x87,
            0x88,0x89,0x8a,0x92,0x93,0x94,0x95,0x96,
            0x97,0x98,0x99,0x9a,0xa2,0xa3,0xa4,0xa5,
            0xa6,0xa7,0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,
            0xb5,0xb6,0xb7,0xb8,0xb9,0xba,0xc2,0xc3,
            0xc4,0xc5,0xc6,0xc7,0xc8,0xc9,0xca,0xd2,
            0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xda,
            0xe2,0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,
            0xea,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,
            0xf9,0xfa
        ];

    function initQuantTables(sf){
            var YQT = [
                16, 11, 10, 16, 24, 40, 51, 61,
                12, 12, 14, 19, 26, 58, 60, 55,
                14, 13, 16, 24, 40, 57, 69, 56,
                14, 17, 22, 29, 51, 87, 80, 62,
                18, 22, 37, 56, 68,109,103, 77,
                24, 35, 55, 64, 81,104,113, 92,
                49, 64, 78, 87,103,121,120,101,
                72, 92, 95, 98,112,100,103, 99
            ];

            for (var i = 0; i < 64; i++) {
                var t = ffloor((YQT[i]*sf+50)/100);
                if (t < 1) {
                    t = 1;
                } else if (t > 255) {
                    t = 255;
                }
                YTable[ZigZag[i]] = t;
            }
            var UVQT = [
                17, 18, 24, 47, 99, 99, 99, 99,
                18, 21, 26, 66, 99, 99, 99, 99,
                24, 26, 56, 99, 99, 99, 99, 99,
                47, 66, 99, 99, 99, 99, 99, 99,
                99, 99, 99, 99, 99, 99, 99, 99,
                99, 99, 99, 99, 99, 99, 99, 99,
                99, 99, 99, 99, 99, 99, 99, 99,
                99, 99, 99, 99, 99, 99, 99, 99
            ];
            for (var j = 0; j < 64; j++) {
                var u = ffloor((UVQT[j]*sf+50)/100);
                if (u < 1) {
                    u = 1;
                } else if (u > 255) {
                    u = 255;
                }
                UVTable[ZigZag[j]] = u;
            }
            var aasf = [
                1.0, 1.387039845, 1.306562965, 1.175875602,
                1.0, 0.785694958, 0.541196100, 0.275899379
            ];
            var k = 0;
            for (var row = 0; row < 8; row++)
            {
                for (var col = 0; col < 8; col++)
                {
                    fdtbl_Y[k]  = (1.0 / (YTable [ZigZag[k]] * aasf[row] * aasf[col] * 8.0));
                    fdtbl_UV[k] = (1.0 / (UVTable[ZigZag[k]] * aasf[row] * aasf[col] * 8.0));
                    k++;
                }
            }
        }

        function computeHuffmanTbl(nrcodes, std_table){
            var codevalue = 0;
            var pos_in_table = 0;
            var HT = new Array();
            for (var k = 1; k <= 16; k++) {
                for (var j = 1; j <= nrcodes[k]; j++) {
                    HT[std_table[pos_in_table]] = [];
                    HT[std_table[pos_in_table]][0] = codevalue;
                    HT[std_table[pos_in_table]][1] = k;
                    pos_in_table++;
                    codevalue++;
                }
                codevalue*=2;
            }
            return HT;
        }

        function initHuffmanTbl()
        {
            YDC_HT = computeHuffmanTbl(std_dc_luminance_nrcodes,std_dc_luminance_values);
            UVDC_HT = computeHuffmanTbl(std_dc_chrominance_nrcodes,std_dc_chrominance_values);
            YAC_HT = computeHuffmanTbl(std_ac_luminance_nrcodes,std_ac_luminance_values);
            UVAC_HT = computeHuffmanTbl(std_ac_chrominance_nrcodes,std_ac_chrominance_values);
        }

        function initCategoryNumber()
        {
            var nrlower = 1;
            var nrupper = 2;
            for (var cat = 1; cat <= 15; cat++) {
                //Positive numbers
                for (var nr = nrlower; nr<nrupper; nr++) {
                    category[32767+nr] = cat;
                    bitcode[32767+nr] = [];
                    bitcode[32767+nr][1] = cat;
                    bitcode[32767+nr][0] = nr;
                }
                //Negative numbers
                for (var nrneg =-(nrupper-1); nrneg<=-nrlower; nrneg++) {
                    category[32767+nrneg] = cat;
                    bitcode[32767+nrneg] = [];
                    bitcode[32767+nrneg][1] = cat;
                    bitcode[32767+nrneg][0] = nrupper-1+nrneg;
                }
                nrlower <<= 1;
                nrupper <<= 1;
            }
        }

        function initRGBYUVTable() {
            for(var i = 0; i < 256;i++) {
                RGB_YUV_TABLE[i]              =  19595 * i;
                RGB_YUV_TABLE[(i+ 256)>>0]     =  38470 * i;
                RGB_YUV_TABLE[(i+ 512)>>0]     =   7471 * i + 0x8000;
                RGB_YUV_TABLE[(i+ 768)>>0]     = -11059 * i;
                RGB_YUV_TABLE[(i+1024)>>0]     = -21709 * i;
                RGB_YUV_TABLE[(i+1280)>>0]     =  32768 * i + 0x807FFF;
                RGB_YUV_TABLE[(i+1536)>>0]     = -27439 * i;
                RGB_YUV_TABLE[(i+1792)>>0]     = - 5329 * i;
            }
        }

        // IO functions
        function writeBits(bs)
        {
            var value = bs[0];
            var posval = bs[1]-1;
            while ( posval >= 0 ) {
                if (value & (1 << posval) ) {
                    bytenew |= (1 << bytepos);
                }
                posval--;
                bytepos--;
                if (bytepos < 0) {
                    if (bytenew == 0xFF) {
                        writeByte(0xFF);
                        writeByte(0);
                    }
                    else {
                        writeByte(bytenew);
                    }
                    bytepos=7;
                    bytenew=0;
                }
            }
        }

        function writeByte(value)
        {
            byteout.push(clt[value]); // write char directly instead of converting later
        }

        function writeWord(value)
        {
            writeByte((value>>8)&0xFF);
            writeByte((value   )&0xFF);
        }

        // DCT & quantization core
        function fDCTQuant(data, fdtbl)
        {
            var d0, d1, d2, d3, d4, d5, d6, d7;
            /* Pass 1: process rows. */
            var dataOff=0;
            var i;
            const I8 = 8;
            const I64 = 64;
            for (i=0; i<I8; ++i)
            {
                d0 = data[dataOff];
                d1 = data[dataOff+1];
                d2 = data[dataOff+2];
                d3 = data[dataOff+3];
                d4 = data[dataOff+4];
                d5 = data[dataOff+5];
                d6 = data[dataOff+6];
                d7 = data[dataOff+7];

                var tmp0 = d0 + d7;
                var tmp7 = d0 - d7;
                var tmp1 = d1 + d6;
                var tmp6 = d1 - d6;
                var tmp2 = d2 + d5;
                var tmp5 = d2 - d5;
                var tmp3 = d3 + d4;
                var tmp4 = d3 - d4;

                /* Even part */
                var tmp10 = tmp0 + tmp3;    /* phase 2 */
                var tmp13 = tmp0 - tmp3;
                var tmp11 = tmp1 + tmp2;
                var tmp12 = tmp1 - tmp2;

                data[dataOff] = tmp10 + tmp11; /* phase 3 */
                data[dataOff+4] = tmp10 - tmp11;

                var z1 = (tmp12 + tmp13) * 0.707106781; /* c4 */
                data[dataOff+2] = tmp13 + z1; /* phase 5 */
                data[dataOff+6] = tmp13 - z1;

                /* Odd part */
                tmp10 = tmp4 + tmp5; /* phase 2 */
                tmp11 = tmp5 + tmp6;
                tmp12 = tmp6 + tmp7;

                /* The rotator is modified from fig 4-8 to avoid extra negations. */
                var z5 = (tmp10 - tmp12) * 0.382683433; /* c6 */
                var z2 = 0.541196100 * tmp10 + z5; /* c2-c6 */
                var z4 = 1.306562965 * tmp12 + z5; /* c2+c6 */
                var z3 = tmp11 * 0.707106781; /* c4 */

                var z11 = tmp7 + z3;    /* phase 5 */
                var z13 = tmp7 - z3;

                data[dataOff+5] = z13 + z2;    /* phase 6 */
                data[dataOff+3] = z13 - z2;
                data[dataOff+1] = z11 + z4;
                data[dataOff+7] = z11 - z4;

                dataOff += 8; /* advance pointer to next row */
            }

            /* Pass 2: process columns. */
            dataOff = 0;
            for (i=0; i<I8; ++i)
            {
                d0 = data[dataOff];
                d1 = data[dataOff + 8];
                d2 = data[dataOff + 16];
                d3 = data[dataOff + 24];
                d4 = data[dataOff + 32];
                d5 = data[dataOff + 40];
                d6 = data[dataOff + 48];
                d7 = data[dataOff + 56];

                var tmp0p2 = d0 + d7;
                var tmp7p2 = d0 - d7;
                var tmp1p2 = d1 + d6;
                var tmp6p2 = d1 - d6;
                var tmp2p2 = d2 + d5;
                var tmp5p2 = d2 - d5;
                var tmp3p2 = d3 + d4;
                var tmp4p2 = d3 - d4;

                /* Even part */
                var tmp10p2 = tmp0p2 + tmp3p2;    /* phase 2 */
                var tmp13p2 = tmp0p2 - tmp3p2;
                var tmp11p2 = tmp1p2 + tmp2p2;
                var tmp12p2 = tmp1p2 - tmp2p2;

                data[dataOff] = tmp10p2 + tmp11p2; /* phase 3 */
                data[dataOff+32] = tmp10p2 - tmp11p2;

                var z1p2 = (tmp12p2 + tmp13p2) * 0.707106781; /* c4 */
                data[dataOff+16] = tmp13p2 + z1p2; /* phase 5 */
                data[dataOff+48] = tmp13p2 - z1p2;

                /* Odd part */
                tmp10p2 = tmp4p2 + tmp5p2; /* phase 2 */
                tmp11p2 = tmp5p2 + tmp6p2;
                tmp12p2 = tmp6p2 + tmp7p2;

                /* The rotator is modified from fig 4-8 to avoid extra negations. */
                var z5p2 = (tmp10p2 - tmp12p2) * 0.382683433; /* c6 */
                var z2p2 = 0.541196100 * tmp10p2 + z5p2; /* c2-c6 */
                var z4p2 = 1.306562965 * tmp12p2 + z5p2; /* c2+c6 */
                var z3p2 = tmp11p2 * 0.707106781; /* c4 */
                var z11p2 = tmp7p2 + z3p2;    /* phase 5 */
                var z13p2 = tmp7p2 - z3p2;

                data[dataOff+40] = z13p2 + z2p2; /* phase 6 */
                data[dataOff+24] = z13p2 - z2p2;
                data[dataOff+ 8] = z11p2 + z4p2;
                data[dataOff+56] = z11p2 - z4p2;

                dataOff++; /* advance pointer to next column */
            }

            // Quantize/descale the coefficients
            var fDCTQuant;
            for (i=0; i<I64; ++i)
            {
                // Apply the quantization and scaling factor & Round to nearest integer
                fDCTQuant = data[i]*fdtbl[i];
                outputfDCTQuant[i] = (fDCTQuant > 0.0) ? ((fDCTQuant + 0.5)|0) : ((fDCTQuant - 0.5)|0);
                //outputfDCTQuant[i] = fround(fDCTQuant);

            }
            return outputfDCTQuant;
        }

        function writeAPP0()
        {
            writeWord(0xFFE0); // marker
            writeWord(16); // length
            writeByte(0x4A); // J
            writeByte(0x46); // F
            writeByte(0x49); // I
            writeByte(0x46); // F
            writeByte(0); // = "JFIF",'\0'
            writeByte(1); // versionhi
            writeByte(1); // versionlo
            writeByte(0); // xyunits
            writeWord(1); // xdensity
            writeWord(1); // ydensity
            writeByte(0); // thumbnwidth
            writeByte(0); // thumbnheight
        }

        function writeSOF0(width, height)
        {
            writeWord(0xFFC0); // marker
            writeWord(17);   // length, truecolor YUV JPG
            writeByte(8);    // precision
            writeWord(height);
            writeWord(width);
            writeByte(3);    // nrofcomponents
            writeByte(1);    // IdY
            writeByte(0x11); // HVY
            writeByte(0);    // QTY
            writeByte(2);    // IdU
            writeByte(0x11); // HVU
            writeByte(1);    // QTU
            writeByte(3);    // IdV
            writeByte(0x11); // HVV
            writeByte(1);    // QTV
        }

        function writeDQT()
        {
            writeWord(0xFFDB); // marker
            writeWord(132);       // length
            writeByte(0);
            for (var i=0; i<64; i++) {
                writeByte(YTable[i]);
            }
            writeByte(1);
            for (var j=0; j<64; j++) {
                writeByte(UVTable[j]);
            }
        }

        function writeDHT()
        {
            writeWord(0xFFC4); // marker
            writeWord(0x01A2); // length

            writeByte(0); // HTYDCinfo
            for (var i=0; i<16; i++) {
                writeByte(std_dc_luminance_nrcodes[i+1]);
            }
            for (var j=0; j<=11; j++) {
                writeByte(std_dc_luminance_values[j]);
            }

            writeByte(0x10); // HTYACinfo
            for (var k=0; k<16; k++) {
                writeByte(std_ac_luminance_nrcodes[k+1]);
            }
            for (var l=0; l<=161; l++) {
                writeByte(std_ac_luminance_values[l]);
            }

            writeByte(1); // HTUDCinfo
            for (var m=0; m<16; m++) {
                writeByte(std_dc_chrominance_nrcodes[m+1]);
            }
            for (var n=0; n<=11; n++) {
                writeByte(std_dc_chrominance_values[n]);
            }

            writeByte(0x11); // HTUACinfo
            for (var o=0; o<16; o++) {
                writeByte(std_ac_chrominance_nrcodes[o+1]);
            }
            for (var p=0; p<=161; p++) {
                writeByte(std_ac_chrominance_values[p]);
            }
        }

        function writeSOS()
        {
            writeWord(0xFFDA); // marker
            writeWord(12); // length
            writeByte(3); // nrofcomponents
            writeByte(1); // IdY
            writeByte(0); // HTY
            writeByte(2); // IdU
            writeByte(0x11); // HTU
            writeByte(3); // IdV
            writeByte(0x11); // HTV
            writeByte(0); // Ss
            writeByte(0x3f); // Se
            writeByte(0); // Bf
        }

        function processDU(CDU, fdtbl, DC, HTDC, HTAC){
            var EOB = HTAC[0x00];
            var M16zeroes = HTAC[0xF0];
            var pos;
            const I16 = 16;
            const I63 = 63;
            const I64 = 64;
            var DU_DCT = fDCTQuant(CDU, fdtbl);
            //ZigZag reorder
            for (var j=0;j<I64;++j) {
                DU[ZigZag[j]]=DU_DCT[j];
            }
            var Diff = DU[0] - DC; DC = DU[0];
            //Encode DC
            if (Diff==0) {
                writeBits(HTDC[0]); // Diff might be 0
            } else {
                pos = 32767+Diff;
                writeBits(HTDC[category[pos]]);
                writeBits(bitcode[pos]);
            }
            //Encode ACs
            var end0pos = 63; // was const... which is crazy
            for (; (end0pos>0)&&(DU[end0pos]==0); end0pos--) {};
            //end0pos = first element in reverse order !=0
            if ( end0pos == 0) {
                writeBits(EOB);
                return DC;
            }
            var i = 1;
            var lng;
            while ( i <= end0pos ) {
                var startpos = i;
                for (; (DU[i]==0) && (i<=end0pos); ++i) {}
                var nrzeroes = i-startpos;
                if ( nrzeroes >= I16 ) {
                    lng = nrzeroes>>4;
                    for (var nrmarker=1; nrmarker <= lng; ++nrmarker)
                        writeBits(M16zeroes);
                    nrzeroes = nrzeroes&0xF;
                }
                pos = 32767+DU[i];
                writeBits(HTAC[(nrzeroes<<4)+category[pos]]);
                writeBits(bitcode[pos]);
                i++;
            }
            if ( end0pos != I63 ) {
                writeBits(EOB);
            }
            return DC;
        }

        function initCharLookupTable(){
            var sfcc = String.fromCharCode;
            for(var i=0; i < 256; i++){ ///// ACHTUNG // 255
                clt[i] = sfcc(i);
            }
        }

        this.encode = function(image,quality,toRaw) // image data object
        {
            var time_start = new Date().getTime();

            if(quality) setQuality(quality);

            // Initialize bit writer
            byteout = new Array();
            bytenew=0;
            bytepos=7;

            // Add JPEG headers
            writeWord(0xFFD8); // SOI
            writeAPP0();
            writeDQT();
            writeSOF0(image.width,image.height);
            writeDHT();
            writeSOS();

            // Encode 8x8 macroblocks
            var DCY=0;
            var DCU=0;
            var DCV=0;

            bytenew=0;
            bytepos=7;

            this.encode.displayName = "_encode_";

            var imageData = image.data;
            var width = image.width;
            var height = image.height;

            var quadWidth = width*4;
            var tripleWidth = width*3;

            var x, y = 0;
            var r, g, b;
            var start,p, col,row,pos;
            while(y < height){
                x = 0;
                while(x < quadWidth){
                start = quadWidth * y + x;
                p = start;
                col = -1;
                row = 0;

                for(pos=0; pos < 64; pos++){
                    row = pos >> 3;// /8
                    col = ( pos & 7 ) * 4; // %8
                    p = start + ( row * quadWidth ) + col;

                    if(y+row >= height){ // padding bottom
                        p-= (quadWidth*(y+1+row-height));
                    }

                    if(x+col >= quadWidth){ // padding right
                        p-= ((x+col) - quadWidth +4)
                    }

                    r = imageData[ p++ ];
                    g = imageData[ p++ ];
                    b = imageData[ p++ ];

                    /* // calculate YUV values dynamically
                    YDU[pos]=((( 0.29900)*r+( 0.58700)*g+( 0.11400)*b))-128; //-0x80
                    UDU[pos]=(((-0.16874)*r+(-0.33126)*g+( 0.50000)*b));
                    VDU[pos]=((( 0.50000)*r+(-0.41869)*g+(-0.08131)*b));
                    */

                    // use lookup table (slightly faster)
                    YDU[pos] = ((RGB_YUV_TABLE[r]             + RGB_YUV_TABLE[(g +  256)>>0] + RGB_YUV_TABLE[(b +  512)>>0]) >> 16)-128;
                    UDU[pos] = ((RGB_YUV_TABLE[(r +  768)>>0] + RGB_YUV_TABLE[(g + 1024)>>0] + RGB_YUV_TABLE[(b + 1280)>>0]) >> 16)-128;
                    VDU[pos] = ((RGB_YUV_TABLE[(r + 1280)>>0] + RGB_YUV_TABLE[(g + 1536)>>0] + RGB_YUV_TABLE[(b + 1792)>>0]) >> 16)-128;

                }

                DCY = processDU(YDU, fdtbl_Y, DCY, YDC_HT, YAC_HT);
                DCU = processDU(UDU, fdtbl_UV, DCU, UVDC_HT, UVAC_HT);
                DCV = processDU(VDU, fdtbl_UV, DCV, UVDC_HT, UVAC_HT);
                x+=32;
                }
                y+=8;
            }

            ////////////////////////////////////////////////////////////////

            // Do the bit alignment of the EOI marker
            if ( bytepos >= 0 ) {
                var fillbits = [];
                fillbits[1] = bytepos+1;
                fillbits[0] = (1<<(bytepos+1))-1;
                writeBits(fillbits);
            }

            writeWord(0xFFD9); //EOI

            if(toRaw) {
                var len = byteout.length;
                var data = new Uint8Array(len);

                for (var i=0; i<len; i++ ) {
                    data[i] = byteout[i].charCodeAt();
                }

                //cleanup
                byteout = [];

                // benchmarking
                var duration = new Date().getTime() - time_start;
                console.log('Encoding time: '+ duration + 'ms');

                return data;
            }

            var jpegDataUri = 'data:image/jpeg;base64,' + btoa(byteout.join(''));

            byteout = [];

            // benchmarking
            var duration = new Date().getTime() - time_start;
            console.log('Encoding time: '+ duration + 'ms');

            return jpegDataUri
    }

    function setQuality(quality){
        if (quality <= 0) {
            quality = 1;
        }
        if (quality > 100) {
            quality = 100;
        }

        if(currentQuality == quality) return // don't recalc if unchanged

        var sf = 0;
        if (quality < 50) {
            sf = Math.floor(5000 / quality);
        } else {
            sf = Math.floor(200 - quality*2);
        }

        initQuantTables(sf);
        currentQuality = quality;
        console.log('Quality set to: '+quality +'%');
    }

    function init(){
        var time_start = new Date().getTime();
        if(!quality) quality = 50;
        // Create tables
        initCharLookupTable()
        initHuffmanTbl();
        initCategoryNumber();
        initRGBYUVTable();

        setQuality(quality);
        var duration = new Date().getTime() - time_start;
        console.log('Initialization '+ duration + 'ms');
    }

    init();

};

/* Example usage. Quality is an int in the range [0, 100]
function example(quality){
    // Pass in an existing image from the page
    var theImg = document.getElementById('testimage');
    // Use a canvas to extract the raw image data
    var cvs = document.createElement('canvas');
    cvs.width = theImg.width;
    cvs.height = theImg.height;
    var ctx = cvs.getContext("2d");
    ctx.drawImage(theImg,0,0);
    var theImgData = (ctx.getImageData(0, 0, cvs.width, cvs.height));
    // Encode the image and get a URI back, toRaw is false by default
    var jpegURI = encoder.encode(theImgData, quality);
    var img = document.createElement('img');
    img.src = jpegURI;
    document.body.appendChild(img);
}

Example usage for getting back raw data and transforming it to a blob.
Raw data is useful when trying to send an image over XHR or Websocket,
it uses around 30% less bytes then a Base64 encoded string. It can
also be useful if you want to save the image to disk using a FileWriter.

NOTE: The browser you are using must support Blobs
function example(quality){
    // Pass in an existing image from the page
    var theImg = document.getElementById('testimage');
    // Use a canvas to extract the raw image data
    var cvs = document.createElement('canvas');
    cvs.width = theImg.width;
    cvs.height = theImg.height;
    var ctx = cvs.getContext("2d");
    ctx.drawImage(theImg,0,0);
    var theImgData = (ctx.getImageData(0, 0, cvs.width, cvs.height));
    // Encode the image and get a URI back, set toRaw to true
    var rawData = encoder.encode(theImgData, quality, true);

    blob = new Blob([rawData.buffer], {type: 'image/jpeg'});
    var jpegURI = URL.createObjectURL(blob);

    var img = document.createElement('img');
    img.src = jpegURI;
    document.body.appendChild(img);
}*/
;currency =
{
    "AED":{
    "code":"AED",
        "symbol":"\u062f.\u0625",
        "name":"United Arab Emirates Dirham",
        "numeric_code":"784",
        "code_placement":"before",
        "minor_unit":"Fils",
        "major_unit":"Dirham"
},
    "AFN":{
    "code":"AFN",
        "symbol":"Af",
        "name":"Afghan Afghani",
        "decimals":0,
        "numeric_code":"971",
        "minor_unit":"Pul",
        "major_unit":"Afghani"
},
    "ANG":{
    "code":"ANG",
        "symbol":"NAf.",
        "name":"Netherlands Antillean Guilder",
        "numeric_code":"532",
        "minor_unit":"Cent",
        "major_unit":"Guilder"
},
    "AOA":{
    "code":"AOA",
        "symbol":"Kz",
        "name":"Angolan Kwanza",
        "numeric_code":"973",
        "minor_unit":"C\u00eantimo",
        "major_unit":"Kwanza"
},
    "ARM":{
    "code":"ARM",
        "symbol":"m$n",
        "name":"Argentine Peso Moneda Nacional",
        "minor_unit":"Centavos",
        "major_unit":"Peso"
},
    "ARS":{
    "code":"ARS",
        "symbol":"AR$",
        "name":"Argentine Peso",
        "numeric_code":"032",
        "minor_unit":"Centavo",
        "major_unit":"Peso"
},
    "AUD":{
    "code":"AUD",
        "symbol":"AU$",
        "name":"Australian Dollar",
        "numeric_code":"036",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "AWG":{
    "code":"AWG",
        "symbol":"Afl.",
        "name":"Aruban Florin",
        "numeric_code":"533",
        "minor_unit":"Cent",
        "major_unit":"Guilder"
},
    "AZN":{
    "code":"AZN",
        "symbol":"man.",
        "name":"Azerbaijanian Manat",
        "minor_unit":"Q\u0259pik",
        "major_unit":"New Manat"
},
    "BAM":{
    "code":"BAM",
        "symbol":"KM",
        "name":"Bosnia-Herzegovina Convertible Mark",
        "numeric_code":"977",
        "minor_unit":"Fening",
        "major_unit":"Convertible Marka"
},
    "BBD":{
    "code":"BBD",
        "symbol":"Bds$",
        "name":"Barbadian Dollar",
        "numeric_code":"052",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "BDT":{
    "code":"BDT",
        "symbol":"Tk",
        "name":"Bangladeshi Taka",
        "numeric_code":"050",
        "minor_unit":"Paisa",
        "major_unit":"Taka"
},
    "BGN":{
    "code":"BGN",
        "symbol":"\u043b\u0432",
        "name":"Bulgarian lev",
        "thousands_separator":" ",
        "decimal_separator":",",
        "symbol_placement":"after",
        "code_placement":"",
        "numeric_code":"975",
        "minor_unit":"Stotinka",
        "major_unit":"Lev"
},
    "BHD":{
    "code":"BHD",
        "symbol":"BD",
        "name":"Bahraini Dinar",
        "decimals":3,
        "numeric_code":"048",
        "minor_unit":"Fils",
        "major_unit":"Dinar"
},
    "BIF":{
    "code":"BIF",
        "symbol":"FBu",
        "name":"Burundian Franc",
        "decimals":0,
        "numeric_code":"108",
        "minor_unit":"Centime",
        "major_unit":"Franc"
},
    "BMD":{
    "code":"BMD",
        "symbol":"BD$",
        "name":"Bermudan Dollar",
        "numeric_code":"060",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "BND":{
    "code":"BND",
        "symbol":"BN$",
        "name":"Brunei Dollar",
        "numeric_code":"096",
        "minor_unit":"Sen",
        "major_unit":"Dollar"
},
    "BOB":{
    "code":"BOB",
        "symbol":"Bs",
        "name":"Bolivian Boliviano",
        "numeric_code":"068",
        "minor_unit":"Centavo",
        "major_unit":"Bolivianos"
},
    "BRL":{
    "code":"BRL",
        "symbol":"R$",
        "name":"Brazilian Real",
        "numeric_code":"986",
        "symbol_placement":"before",
        "code_placement":"",
        "thousands_separator":".",
        "decimal_separator":",",
        "minor_unit":"Centavo",
        "major_unit":"Reais"
},
    "BSD":{
    "code":"BSD",
        "symbol":"BS$",
        "name":"Bahamian Dollar",
        "numeric_code":"044",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "BTN":{
    "code":"BTN",
        "symbol":"Nu.",
        "name":"Bhutanese Ngultrum",
        "numeric_code":"064",
        "minor_unit":"Chetrum",
        "major_unit":"Ngultrum"
},
    "BWP":{
    "code":"BWP",
        "symbol":"BWP",
        "name":"Botswanan Pula",
        "numeric_code":"072",
        "minor_unit":"Thebe",
        "major_unit":"Pulas"
},
    "BYR":{
    "code":"BYR",
        "symbol":"\u0440\u0443\u0431.",
        "name":"Belarusian ruble",
        "numeric_code":"974",
        "symbol_placement":"after",
        "code_placement":"",
        "decimals":0,
        "thousands_separator":" ",
        "major_unit":"Ruble"
},
    "BZD":{
    "code":"BZD",
        "symbol":"BZ$",
        "name":"Belize Dollar",
        "numeric_code":"084",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "CAD":{
    "code":"CAD",
        "symbol":"CA$",
        "name":"Canadian Dollar",
        "numeric_code":"124",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "CDF":{
    "code":"CDF",
        "symbol":"CDF",
        "name":"Congolese Franc",
        "numeric_code":"976",
        "minor_unit":"Centime",
        "major_unit":"Franc"
},
    "CHF":{
    "code":"CHF",
        "symbol":"Fr.",
        "name":"Swiss Franc",
        "rounding_step":"0.05",
        "numeric_code":"756",
        "minor_unit":"Rappen",
        "major_unit":"Franc"
},
    "CLP":{
    "code":"CLP",
        "symbol":"CL$",
        "name":"Chilean Peso",
        "decimals":0,
        "numeric_code":"152",
        "minor_unit":"Centavo",
        "major_unit":"Peso"
},
    "CNY":{
    "code":"CNY",
        "symbol":"CN\u00a5",
        "name":"Chinese Yuan Renminbi",
        "numeric_code":"156",
        "minor_unit":"Fe",
        "major_unit":"Yuan Renminbi"
},
    "COP":{
    "code":"COP",
        "symbol":"$",
        "name":"Colombian Peso",
        "decimals":0,
        "numeric_code":"170",
        "symbol_placement":"before",
        "code_placement":"hidden",
        "thousands_separator":".",
        "decimal_separator":",",
        "minor_unit":"Centavo",
        "major_unit":"Peso"
},
    "CRC":{
    "code":"CRC",
        "symbol":"\u00a2",
        "name":"Costa Rican Col\u00f3n",
        "decimals":0,
        "numeric_code":"188",
        "minor_unit":"C\u00e9ntimo",
        "major_unit":"Col\u00f3n"
},
    "CUC":{
    "code":"CUC",
        "symbol":"CUC$",
        "name":"Cuban Convertible Peso",
        "minor_unit":"Centavo",
        "major_unit":"Peso"
},
    "CUP":{
    "code":"CUP",
        "symbol":"CU$",
        "name":"Cuban Peso",
        "numeric_code":"192",
        "minor_unit":"Centavo",
        "major_unit":"Peso"
},
    "CVE":{
    "code":"CVE",
        "symbol":"CV$",
        "name":"Cape Verdean Escudo",
        "numeric_code":"132",
        "minor_unit":"Centavo",
        "major_unit":"Escudo"
},
    "CZK":{
    "code":"CZK",
        "symbol":"K\u010d",
        "name":"Czech Republic Koruna",
        "numeric_code":"203",
        "thousands_separator":" ",
        "decimal_separator":",",
        "symbol_placement":"after",
        "code_placement":"",
        "minor_unit":"Hal\u00e9\u0159",
        "major_unit":"Koruna"
},
    "DJF":{
    "code":"DJF",
        "symbol":"Fdj",
        "name":"Djiboutian Franc",
        "numeric_code":"262",
        "decimals":0,
        "minor_unit":"Centime",
        "major_unit":"Franc"
},
    "DKK":{
    "code":"DKK",
        "symbol":"kr.",
        "name":"Danish Krone",
        "numeric_code":"208",
        "thousands_separator":" ",
        "decimal_separator":",",
        "symbol_placement":"after",
        "code_placement":"",
        "minor_unit":"\u00d8re",
        "major_unit":"Kroner"
},
    "DOP":{
    "code":"DOP",
        "symbol":"RD$",
        "name":"Dominican Peso",
        "numeric_code":"214",
        "minor_unit":"Centavo",
        "major_unit":"Peso"
},
    "DZD":{
    "code":"DZD",
        "symbol":"DA",
        "name":"Algerian Dinar",
        "numeric_code":"012",
        "minor_unit":"Santeem",
        "major_unit":"Dinar"
},
    "EEK":{
    "code":"EEK",
        "symbol":"Ekr",
        "name":"Estonian Kroon",
        "thousands_separator":" ",
        "decimal_separator":",",
        "numeric_code":"233",
        "minor_unit":"Sent",
        "major_unit":"Krooni"
},
    "EGP":{
    "code":"EGP",
        "symbol":"EG\u00a3",
        "name":"Egyptian Pound",
        "numeric_code":"818",
        "minor_unit":"Piastr",
        "major_unit":"Pound"
},
    "ERN":{
    "code":"ERN",
        "symbol":"Nfk",
        "name":"Eritrean Nakfa",
        "numeric_code":"232",
        "minor_unit":"Cent",
        "major_unit":"Nakfa"
},
    "ETB":{
    "code":"ETB",
        "symbol":"Br",
        "name":"Ethiopian Birr",
        "numeric_code":"230",
        "minor_unit":"Santim",
        "major_unit":"Birr"
},
    "EUR":{
    "code":"EUR",
        "symbol":"\u20ac",
        "name":"Euro",
        "thousands_separator":" ",
        "decimal_separator":",",
        "symbol_placement":"after",
        "code_placement":"",
        "numeric_code":"978",
        "minor_unit":"Cent",
        "major_unit":"Euro"
},
    "FJD":{
    "code":"FJD",
        "symbol":"FJ$",
        "name":"Fijian Dollar",
        "numeric_code":"242",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "FKP":{
    "code":"FKP",
        "symbol":"FK\u00a3",
        "name":"Falkland Islands Pound",
        "numeric_code":"238",
        "minor_unit":"Penny",
        "major_unit":"Pound"
},
    "GBP":{
    "code":"GBP",
        "symbol":"\u00a3",
        "name":"British Pound Sterling",
        "numeric_code":"826",
        "symbol_placement":"before",
        "code_placement":"",
        "minor_unit":"Penny",
        "major_unit":"Pound"
},
    "GHS":{
    "code":"GHS",
        "symbol":"GH\u20b5",
        "name":"Ghanaian Cedi",
        "minor_unit":"Pesewa",
        "major_unit":"Cedi"
},
    "GIP":{
    "code":"GIP",
        "symbol":"GI\u00a3",
        "name":"Gibraltar Pound",
        "numeric_code":"292",
        "minor_unit":"Penny",
        "major_unit":"Pound"
},
    "GMD":{
    "code":"GMD",
        "symbol":"GMD",
        "name":"Gambian Dalasi",
        "numeric_code":"270",
        "minor_unit":"Butut",
        "major_unit":"Dalasis"
},
    "GNF":{
    "code":"GNF",
        "symbol":"FG",
        "name":"Guinean Franc",
        "decimals":0,
        "numeric_code":"324",
        "minor_unit":"Centime",
        "major_unit":"Franc"
},
    "GTQ":{
    "code":"GTQ",
        "symbol":"GTQ",
        "name":"Guatemalan Quetzal",
        "numeric_code":"320",
        "minor_unit":"Centavo",
        "major_unit":"Quetzales"
},
    "GYD":{
    "code":"GYD",
        "symbol":"GY$",
        "name":"Guyanaese Dollar",
        "decimals":0,
        "numeric_code":"328",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "HKD":{
    "code":"HKD",
        "symbol":"HK$",
        "name":"Hong Kong Dollar",
        "numeric_code":"344",
        "symbol_placement":"before",
        "code_placement":"",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "HNL":{
    "code":"HNL",
        "symbol":"HNL",
        "name":"Honduran Lempira",
        "numeric_code":"340",
        "minor_unit":"Centavo",
        "major_unit":"Lempiras"
},
    "HRK":{
    "code":"HRK",
        "symbol":"kn",
        "name":"Croatian Kuna",
        "numeric_code":"191",
        "minor_unit":"Lipa",
        "major_unit":"Kuna"
},
    "HTG":{
    "code":"HTG",
        "symbol":"HTG",
        "name":"Haitian Gourde",
        "numeric_code":"332",
        "minor_unit":"Centime",
        "major_unit":"Gourde"
},
    "HUF":{
    "code":"HUF",
        "symbol":"Ft",
        "name":"Hungarian Forint",
        "numeric_code":"348",
        "decimal_separator":",",
        "thousands_separator":" ",
        "decimals":0,
        "symbol_placement":"after",
        "code_placement":"",
        "major_unit":"Forint"
},
    "IDR":{
    "code":"IDR",
        "symbol":"Rp",
        "name":"Indonesian Rupiah",
        "decimals":0,
        "numeric_code":"360",
        "minor_unit":"Sen",
        "major_unit":"Rupiahs"
},
    "ILS":{
    "code":"ILS",
        "symbol":"\u20aa",
        "name":"Israeli New Shekel",
        "numeric_code":"376",
        "symbol_placement":"before",
        "code_placement":"",
        "minor_unit":"Agora",
        "major_unit":"New Shekels"
},
    "INR":{
    "code":"INR",
        "symbol":"Rs",
        "name":"Indian Rupee",
        "numeric_code":"356",
        "minor_unit":"Paisa",
        "major_unit":"Rupee"
},
    "IRR":{
    "code":"IRR",
        "symbol":"\ufdfc",
        "name":"Iranian Rial",
        "numeric_code":"364",
        "symbol_placement":"after",
        "code_placement":"",
        "minor_unit":"Rial",
        "major_unit":"Toman"
},
    "ISK":{
    "code":"ISK",
        "symbol":"Ikr",
        "name":"Icelandic Kr\u00f3na",
        "decimals":0,
        "thousands_separator":" ",
        "numeric_code":"352",
        "minor_unit":"Eyrir",
        "major_unit":"Kronur"
},
    "JMD":{
    "code":"JMD",
        "symbol":"J$",
        "name":"Jamaican Dollar",
        "numeric_code":"388",
        "symbol_placement":"before",
        "code_placement":"",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "JOD":{
    "code":"JOD",
        "symbol":"JD",
        "name":"Jordanian Dinar",
        "decimals":3,
        "numeric_code":"400",
        "minor_unit":"Piastr",
        "major_unit":"Dinar"
},
    "JPY":{
    "code":"JPY",
        "symbol":"\u00a5",
        "name":"Japanese Yen",
        "decimals":0,
        "numeric_code":"392",
        "symbol_placement":"before",
        "code_placement":"",
        "minor_unit":"Sen",
        "major_unit":"Yen"
},
    "KES":{
    "code":"KES",
        "symbol":"Ksh",
        "name":"Kenyan Shilling",
        "numeric_code":"404",
        "minor_unit":"Cent",
        "major_unit":"Shilling"
},
    "KGS":{
    "code":"KGS",
        "code_placement":"",
        "symbol":"\u0441\u043e\u043c",
        "symbol_placement":"after",
        "name":"Kyrgyzstani Som",
        "numeric_code":"417",
        "thousands_separator":"",
        "major_unit":"Som",
        "minor_unit":"Tyiyn"
},
    "KMF":{
    "code":"KMF",
        "symbol":"CF",
        "name":"Comorian Franc",
        "decimals":0,
        "numeric_code":"174",
        "minor_unit":"Centime",
        "major_unit":"Franc"
},
    "KRW":{
    "code":"KRW",
        "symbol":"\u20a9",
        "name":"South Korean Won",
        "decimals":0,
        "numeric_code":"410",
        "minor_unit":"Jeon",
        "major_unit":"Won"
},
    "KWD":{
    "code":"KWD",
        "symbol":"KD",
        "name":"Kuwaiti Dinar",
        "decimals":3,
        "numeric_code":"414",
        "minor_unit":"Fils",
        "major_unit":"Dinar"
},
    "KYD":{
    "code":"KYD",
        "symbol":"KY$",
        "name":"Cayman Islands Dollar",
        "numeric_code":"136",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "KZT":{
    "code":"KZT",
        "symbol":"\u0442\u0433.",
        "name":"Kazakhstani tenge",
        "numeric_code":"398",
        "thousands_separator":" ",
        "decimal_separator":",",
        "symbol_placement":"after",
        "code_placement":"",
        "minor_unit":"Tiyn",
        "major_unit":"Tenge"
},
    "LAK":{
    "code":"LAK",
        "symbol":"\u20adN",
        "name":"Laotian Kip",
        "decimals":0,
        "numeric_code":"418",
        "minor_unit":"Att",
        "major_unit":"Kips"
},
    "LBP":{
    "code":"LBP",
        "symbol":"LB\u00a3",
        "name":"Lebanese Pound",
        "decimals":0,
        "numeric_code":"422",
        "minor_unit":"Piastre",
        "major_unit":"Pound"
},
    "LKR":{
    "code":"LKR",
        "symbol":"SLRs",
        "name":"Sri Lanka Rupee",
        "numeric_code":"144",
        "minor_unit":"Cent",
        "major_unit":"Rupee"
},
    "LRD":{
    "code":"LRD",
        "symbol":"L$",
        "name":"Liberian Dollar",
        "numeric_code":"430",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "LSL":{
    "code":"LSL",
        "symbol":"LSL",
        "name":"Lesotho Loti",
        "numeric_code":"426",
        "minor_unit":"Sente",
        "major_unit":"Loti"
},
    "LTL":{
    "code":"LTL",
        "symbol":"Lt",
        "name":"Lithuanian Litas",
        "numeric_code":"440",
        "minor_unit":"Centas",
        "major_unit":"Litai"
},
    "LVL":{
    "code":"LVL",
        "symbol":"Ls",
        "name":"Latvian Lats",
        "numeric_code":"428",
        "minor_unit":"Santims",
        "major_unit":"Lati"
},
    "LYD":{
    "code":"LYD",
        "symbol":"LD",
        "name":"Libyan Dinar",
        "decimals":3,
        "numeric_code":"434",
        "minor_unit":"Dirham",
        "major_unit":"Dinar"
},
    "MAD":{
    "code":"MAD",
        "symbol":" Dhs",
        "name":"Moroccan Dirham",
        "numeric_code":"504",
        "symbol_placement":"after",
        "code_placement":"",
        "minor_unit":"Santimat",
        "major_unit":"Dirhams"
},
    "MDL":{
    "code":"MDL",
        "symbol":"MDL",
        "name":"Moldovan leu",
        "symbol_placement":"after",
        "numeric_code":"498",
        "code_placement":"",
        "minor_unit":"bani",
        "major_unit":"Lei"
},
    "MMK":{
    "code":"MMK",
        "symbol":"MMK",
        "name":"Myanma Kyat",
        "decimals":0,
        "numeric_code":"104",
        "minor_unit":"Pya",
        "major_unit":"Kyat"
},
    "MNT":{
    "code":"MNT",
        "symbol":"\u20ae",
        "name":"Mongolian Tugrik",
        "decimals":0,
        "numeric_code":"496",
        "minor_unit":"M\u00f6ng\u00f6",
        "major_unit":"Tugriks"
},
    "MOP":{
    "code":"MOP",
        "symbol":"MOP$",
        "name":"Macanese Pataca",
        "numeric_code":"446",
        "minor_unit":"Avo",
        "major_unit":"Pataca"
},
    "MRO":{
    "code":"MRO",
        "symbol":"UM",
        "name":"Mauritanian Ouguiya",
        "decimals":0,
        "numeric_code":"478",
        "minor_unit":"Khoums",
        "major_unit":"Ouguiya"
},
    "MTP":{
    "code":"MTP",
        "symbol":"MT\u00a3",
        "name":"Maltese Pound",
        "minor_unit":"Shilling",
        "major_unit":"Pound"
},
    "MUR":{
    "code":"MUR",
        "symbol":"MURs",
        "name":"Mauritian Rupee",
        "decimals":0,
        "numeric_code":"480",
        "minor_unit":"Cent",
        "major_unit":"Rupee"
},
    "MXN":{
    "code":"MXN",
        "symbol":"$",
        "name":"Mexican Peso",
        "numeric_code":"484",
        "symbol_placement":"before",
        "code_placement":"",
        "minor_unit":"Centavo",
        "major_unit":"Peso"
},
    "MYR":{
    "code":"MYR",
        "symbol":"RM",
        "name":"Malaysian Ringgit",
        "numeric_code":"458",
        "symbol_placement":"before",
        "code_placement":"",
        "minor_unit":"Sen",
        "major_unit":"Ringgits"
},
    "MZN":{
    "code":"MZN",
        "symbol":"MTn",
        "name":"Mozambican Metical",
        "minor_unit":"Centavo",
        "major_unit":"Metical"
},
    "NAD":{
    "code":"NAD",
        "symbol":"N$",
        "name":"Namibian Dollar",
        "numeric_code":"516",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "NGN":{
    "code":"NGN",
        "symbol":"\u20a6",
        "name":"Nigerian Naira",
        "numeric_code":"566",
        "minor_unit":"Kobo",
        "major_unit":"Naira"
},
    "NIO":{
    "code":"NIO",
        "symbol":"C$",
        "name":"Nicaraguan Cordoba Oro",
        "numeric_code":"558",
        "minor_unit":"Centavo",
        "major_unit":"Cordoba"
},
    "NOK":{
    "code":"NOK",
        "symbol":"Nkr",
        "name":"Norwegian Krone",
        "thousands_separator":" ",
        "decimal_separator":",",
        "numeric_code":"578",
        "minor_unit":"\u00d8re",
        "major_unit":"Krone"
},
    "NPR":{
    "code":"NPR",
        "symbol":"NPRs",
        "name":"Nepalese Rupee",
        "numeric_code":"524",
        "minor_unit":"Paisa",
        "major_unit":"Rupee"
},
    "NZD":{
    "code":"NZD",
        "symbol":"NZ$",
        "name":"New Zealand Dollar",
        "numeric_code":"554",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "PAB":{
    "code":"PAB",
        "symbol":"B\/.",
        "name":"Panamanian Balboa",
        "numeric_code":"590",
        "minor_unit":"Cent\u00e9simo",
        "major_unit":"Balboa"
},
    "PEN":{
    "code":"PEN",
        "symbol":"S\/.",
        "name":"Peruvian Nuevo Sol",
        "numeric_code":"604",
        "symbol_placement":"before",
        "code_placement":"",
        "minor_unit":"C\u00e9ntimo",
        "major_unit":"Nuevos Sole"
},
    "PGK":{
    "code":"PGK",
        "symbol":"PGK",
        "name":"Papua New Guinean Kina",
        "numeric_code":"598",
        "minor_unit":"Toea",
        "major_unit":"Kina "
},
    "PHP":{
    "code":"PHP",
        "symbol":"\u20b1",
        "name":"Philippine Peso",
        "numeric_code":"608",
        "minor_unit":"Centavo",
        "major_unit":"Peso"
},
    "PKR":{
    "code":"PKR",
        "symbol":"PKRs",
        "name":"Pakistani Rupee",
        "decimals":0,
        "numeric_code":"586",
        "minor_unit":"Paisa",
        "major_unit":"Rupee"
},
    "PLN":{
    "code":"PLN",
        "symbol":"z\u0142",
        "name":"Polish Z\u0142oty",
        "decimal_separator":",",
        "thousands_separator":" ",
        "numeric_code":"985",
        "symbol_placement":"after",
        "code_placement":"",
        "minor_unit":"Grosz",
        "major_unit":"Z\u0142otych"
},
    "PYG":{
    "code":"PYG",
        "symbol":"\u20b2",
        "name":"Paraguayan Guarani",
        "decimals":0,
        "numeric_code":"600",
        "minor_unit":"C\u00e9ntimo",
        "major_unit":"Guarani"
},
    "QAR":{
    "code":"QAR",
        "symbol":"QR",
        "name":"Qatari Rial",
        "numeric_code":"634",
        "minor_unit":"Dirham",
        "major_unit":"Rial"
},
    "RHD":{
    "code":"RHD",
        "symbol":"RH$",
        "name":"Rhodesian Dollar",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "RON":{
    "code":"RON",
        "symbol":"RON",
        "name":"Romanian Leu",
        "minor_unit":"Ban",
        "major_unit":"Leu"
},
    "RSD":{
    "code":"RSD",
        "symbol":"din.",
        "name":"Serbian Dinar",
        "decimals":0,
        "minor_unit":"Para",
        "major_unit":"Dinars"
},
    "RUB":{
    "code":"RUB",
        "symbol":"\u0440\u0443\u0431.",
        "name":"Russian Ruble",
        "thousands_separator":" ",
        "decimal_separator":",",
        "numeric_code":"643",
        "symbol_placement":"after",
        "code_placement":"",
        "minor_unit":"Kopek",
        "major_unit":"Ruble"
},
    "SAR":{
    "code":"SAR",
        "symbol":"SR",
        "name":"Saudi Riyal",
        "numeric_code":"682",
        "minor_unit":"Hallallah",
        "major_unit":"Riyals"
},
    "SBD":{
    "code":"SBD",
        "symbol":"SI$",
        "name":"Solomon Islands Dollar",
        "numeric_code":"090",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "SCR":{
    "code":"SCR",
        "symbol":"SRe",
        "name":"Seychellois Rupee",
        "numeric_code":"690",
        "minor_unit":"Cent",
        "major_unit":"Rupee"
},
    "SDD":{
    "code":"SDD",
        "symbol":"LSd",
        "name":"Old Sudanese Dinar",
        "numeric_code":"736",
        "minor_unit":"None",
        "major_unit":"Dinar"
},
    "SEK":{
    "code":"SEK",
        "symbol":"kr",
        "name":"Swedish Krona",
        "numeric_code":"752",
        "thousands_separator":" ",
        "decimal_separator":",",
        "symbol_placement":"after",
        "code_placement":"",
        "minor_unit":"\u00d6re",
        "major_unit":"Kronor"
},
    "SGD":{
    "code":"SGD",
        "symbol":"S$",
        "name":"Singapore Dollar",
        "numeric_code":"702",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "SHP":{
    "code":"SHP",
        "symbol":"SH\u00a3",
        "name":"Saint Helena Pound",
        "numeric_code":"654",
        "minor_unit":"Penny",
        "major_unit":"Pound"
},
    "SLL":{
    "code":"SLL",
        "symbol":"Le",
        "name":"Sierra Leonean Leone",
        "decimals":0,
        "numeric_code":"694",
        "minor_unit":"Cent",
        "major_unit":"Leone"
},
    "SOS":{
    "code":"SOS",
        "symbol":"Ssh",
        "name":"Somali Shilling",
        "decimals":0,
        "numeric_code":"706",
        "minor_unit":"Cent",
        "major_unit":"Shilling"
},
    "SRD":{
    "code":"SRD",
        "symbol":"SR$",
        "name":"Surinamese Dollar",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "SRG":{
    "code":"SRG",
        "symbol":"Sf",
        "name":"Suriname Guilder",
        "numeric_code":"740",
        "minor_unit":"Cent",
        "major_unit":"Guilder"
},
    "STD":{
    "code":"STD",
        "symbol":"Db",
        "name":"S\u00e3o Tom\u00e9 and Pr\u00edncipe Dobra",
        "decimals":0,
        "numeric_code":"678",
        "minor_unit":"C\u00eantimo",
        "major_unit":"Dobra"
},
    "SYP":{
    "code":"SYP",
        "symbol":"SY\u00a3",
        "name":"Syrian Pound",
        "decimals":0,
        "numeric_code":"760",
        "minor_unit":"Piastre",
        "major_unit":"Pound"
},
    "SZL":{
    "code":"SZL",
        "symbol":"SZL",
        "name":"Swazi Lilangeni",
        "numeric_code":"748",
        "minor_unit":"Cent",
        "major_unit":"Lilangeni"
},
    "THB":{
    "code":"THB",
        "symbol":"\u0e3f",
        "name":"Thai Baht",
        "numeric_code":"764",
        "minor_unit":"Satang",
        "major_unit":"Baht"
},
    "TND":{
    "code":"TND",
        "symbol":"DT",
        "name":"Tunisian Dinar",
        "decimals":3,
        "numeric_code":"788",
        "minor_unit":"Millime",
        "major_unit":"Dinar"
},
    "TOP":{
    "code":"TOP",
        "symbol":"T$",
        "name":"Tongan Pa\u02bbanga",
        "numeric_code":"776",
        "minor_unit":"Senit",
        "major_unit":"Pa\u02bbanga"
},
    "TRY":{
    "code":"TRY",
        "symbol":"TL",
        "name":"Turkish Lira",
        "numeric_code":"949",
        "thousands_separator":".",
        "decimal_separator":",",
        "symbol_placement":"after",
        "code_placement":"",
        "minor_unit":"Kurus",
        "major_unit":"Lira"
},
    "TTD":{
    "code":"TTD",
        "symbol":"TT$",
        "name":"Trinidad and Tobago Dollar",
        "numeric_code":"780",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "TWD":{
    "code":"TWD",
        "symbol":"NT$",
        "name":"New Taiwan Dollar",
        "numeric_code":"901",
        "minor_unit":"Cent",
        "major_unit":"New Dollar"
},
    "TZS":{
    "code":"TZS",
        "symbol":"TSh",
        "name":"Tanzanian Shilling",
        "decimals":0,
        "numeric_code":"834",
        "minor_unit":"Senti",
        "major_unit":"Shilling"
},
    "UAH":{
    "code":"UAH",
        "symbol":"\u0433\u0440\u043d.",
        "name":"Ukrainian Hryvnia",
        "numeric_code":"980",
        "thousands_separator":"",
        "decimal_separator":".",
        "symbol_placement":"after",
        "code_placement":"",
        "minor_unit":"Kopiyka",
        "major_unit":"Hryvnia"
},
    "UGX":{
    "code":"UGX",
        "symbol":"USh",
        "name":"Ugandan Shilling",
        "decimals":0,
        "numeric_code":"800",
        "minor_unit":"Cent",
        "major_unit":"Shilling"
},
    "USD":{
    "code":"USD",
        "symbol":"$",
        "name":"United States Dollar",
        "numeric_code":"840",
        "symbol_placement":"before",
        "code_placement":"",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "UYU":{
    "code":"UYU",
        "symbol":"$U",
        "name":"Uruguayan Peso",
        "numeric_code":"858",
        "minor_unit":"Cent\u00e9simo",
        "major_unit":"Peso"
},
    "VEF":{
    "code":"VEF",
        "symbol":"Bs.F.",
        "name":"Venezuelan Bol\u00edvar Fuerte",
        "minor_unit":"C\u00e9ntimo",
        "major_unit":"Bolivares Fuerte"
},
    "VND":{
    "code":"VND",
        "symbol":"\u0111",
        "name":"Vietnamese Dong",
        "decimals":0,
        "thousands_separator":".",
        "symbol_placement":"after",
        "symbol_spacer":"",
        "code_placement":"",
        "numeric_code":"704",
        "minor_unit":"H\u00e0",
        "major_unit":"Dong"
},
    "VUV":{
    "code":"VUV",
        "symbol":"VT",
        "name":"Vanuatu Vatu",
        "decimals":0,
        "numeric_code":"548",
        "major_unit":"Vatu"
},
    "WST":{
    "code":"WST",
        "symbol":"WS$",
        "name":"Samoan Tala",
        "numeric_code":"882",
        "minor_unit":"Sene",
        "major_unit":"Tala"
},
    "XAF":{
    "code":"XAF",
        "symbol":"FCFA",
        "name":"CFA Franc BEAC",
        "decimals":0,
        "numeric_code":"950",
        "minor_unit":"Centime",
        "major_unit":"Franc"
},
    "XCD":{
    "code":"XCD",
        "symbol":"EC$",
        "name":"East Caribbean Dollar",
        "numeric_code":"951",
        "minor_unit":"Cent",
        "major_unit":"Dollar"
},
    "XOF":{
    "code":"XOF",
        "symbol":"CFA",
        "name":"CFA Franc BCEAO",
        "decimals":0,
        "numeric_code":"952",
        "minor_unit":"Centime",
        "major_unit":"Franc"
},
    "XPF":{
    "code":"XPF",
        "symbol":"CFPF",
        "name":"CFP Franc",
        "decimals":0,
        "numeric_code":"953",
        "minor_unit":"Centime",
        "major_unit":"Franc"
},
    "YER":{
    "code":"YER",
        "symbol":"YR",
        "name":"Yemeni Rial",
        "decimals":0,
        "numeric_code":"886",
        "minor_unit":"Fils",
        "major_unit":"Rial"
},
    "ZAR":{
    "code":"ZAR",
        "symbol":"R",
        "name":"South African Rand",
        "numeric_code":"710",
        "symbol_placement":"before",
        "code_placement":"",
        "minor_unit":"Cent",
        "major_unit":"Rand"
},
    "ZMK":{
    "code":"ZMK",
        "symbol":"ZK",
        "name":"Zambian Kwacha",
        "decimals":0,
        "numeric_code":"894",
        "minor_unit":"Ngwee",
        "major_unit":"Kwacha"
}
};'use strict';

angular.module('bazaarr', ['ionic', 'ngCordova', 'ngCookies', 'LocalStorageModule', 'imagenie', 'sf.virtualScroll', 'ngToast', 'ionic.ui.superSlideBox'])
//.value('server_url', "http://bazaarr.dev").value('connect_url', "mbazar")
.value('server_url', window.location.protocol + '//' + window.location.host).value('connect_url', window.location.host)//"app.icenium.com"
.value('clip', {})
/*.constant('$ionicLoadingConfig', {
  'duration': 5000,
  'template' : '<ion-spinner></ion-spinner>'
})*/
.config(function($stateProvider, $urlRouterProvider, $httpProvider, $ionicConfigProvider, ngToastProvider) {
    $stateProvider
        .state('claim-user', {
            url: '/claim-user/:userId',
            cache: false,
            controller: 'ClaimCtrl',
            templateUrl: 'views/user/claim-user.html'
        }).state('claim', {
            url: '/claim',
            cache: false,
            controller: 'ClaimCtrl',
            templateUrl: 'views/user/claim-list.html'
        })
        .state('hashtag', {
            url: '/hashtag/:hashtagName',
            resolve: {
                clips: function(ClipsService, $stateParams) {
                    return ClipsService.load("hashtags", false, {hashtags: $stateParams.hashtagName});
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clips.html'
        })
        .state('recent', {
            url: '/recent',
            resolve: {
                clips: function(ClipsService) {
                    return ClipsService.load("recent", false);
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clips.html'
        })
        .state('following', {
            url: '/following',
            resolve: {
                clips: function(ClipsService) {
                    return ClipsService.load("following", true);
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clips.html'
        })
        .state('shop', {
            url: '/shop',
            resolve: {
                clips: function(ClipsService) {
                    return ClipsService.load("shop", false);
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clips.html'
        })
        .state('category', {
            url: '/category/:catId',
            resolve: {
                clips: function(ClipsService, $stateParams) {
                    return ClipsService.load("clips-category", false, {"tid_raw" : $stateParams.catId});
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clips.html'
        })
        .state('account', {
            url: "/account/:userId",
            //cache: false,
            resolve: {
                account: function(AccountService, $stateParams) {
                    return AccountService.load($stateParams.userId);
                }
            },
            controller: 'UserCtrl',
            templateUrl: 'views/user_tabs.html'
        })
        .state('account.collections', {
            url: "/collections",
            resolve: {
                collections: function (CollectionService) {
                    return CollectionService.load2();
                }
            },
            controller: 'CollectionListCtrl',
            templateUrl: 'views/user/collections.html'
        })
        .state('account.clips', {
            url: "/clips",
            resolve: {
                clips: function(ClipsService) {
                    return ClipsService.load("clips", true);
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clip/scroll-list.html'
        })
        .state('account.likes', {
            url: "/likes",
            resolve: {
                clips: function(ClipsService) {
                    return ClipsService.load("likes", true);
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clip/scroll-list.html'
        })
        .state('account.following-users', {
            url: "/following-users",
            resolve: {
                follows: function(FollowService) {
                    return FollowService.loadFollowing();
                }
            },
            controller: 'FollowCtrl',
            templateUrl: 'views/user/follow.html'
        })
        .state('account.following-collections', {
            url: "/following-collections",
            resolve: {
                collections: function(FollowService) {
                    return FollowService.loadCollections();
                }
            },
            controller: 'CollectionListCtrl',
            templateUrl: 'views/user/collections.html'
        })
        .state('account.followers', {
            url: "/followers",
            resolve: {
                follows: function(FollowService) {
                    return FollowService.loadFollowers();
                }
            },
            controller: 'FollowCtrl',
            templateUrl: 'views/user/follow.html'
        })
        .state('account.contact', {
            url: "/contact",
            controller: 'ContactCtrl',
            templateUrl: 'views/user/contact.html'
        })
        .state('account.about', {
            url: "/about",
            controller: 'AboutCtrl',
            templateUrl: 'views/user/about.html'
        })
        .state('collection', {
            url: '/collection/:colId',
            resolve: {
                collection: function(CollectionService, $stateParams) {
                    return CollectionService.singleLoad($stateParams.colId);
                },
                collection_counters: function(CollectionService, $stateParams) {
                    return CollectionService.getCounters($stateParams.colId);
                }
            },
            controller: 'CollectionCoverCtrl',
            templateUrl: 'views/collection/cover.html'
        })
        .state('login', {
            url : '/login',
            cache: false,
            controller : 'LoginCtrl',
            templateUrl: 'views/login.html'
        })
        .state('add', {
            url: "/add",
            cache: false,
            controller : 'AddClipCtrl',
            templateUrl: 'views/clip/add.html'
        })
        .state('edit-clip', {
            url: "/edit-clip/:clipId",
            cache : false,
            controller : 'AddClipCtrl',
            templateUrl: 'views/clip/add.html'
        })
        .state('reclip', {
            url: "/reclip/:clipId",
            cache: false,
            controller : 'AddClipCtrl',
            templateUrl: 'views/clip/reclip.html'
        })
        .state('edit_profile', {
            url: "/edit_profile",
            controller : 'ProfileCtrl',
            templateUrl: 'views/user/edit-profile.html'
        })
        .state('edit_account', {
            url: "/edit_account",
            controller : 'ProfileCtrl',
            templateUrl: 'views/user/account-settings.html'
        })
        .state('clip', {
            url: "/clip/:clipId",
            cache: false,
            controller : "ClipCtrl",
            resolve: {
                clip: function(ClipService, $stateParams) {
                    return ClipService.load($stateParams.clipId);
                }
            },
            templateUrl: 'views/clip/clip-view.html'
        })
        .state('clip-article', {
            url: "/clip-article/:clipId",
            cache: false,
            controller : "ClipCtrl",
            resolve: {
                clip: function(ClipService, $stateParams) {
                    return ClipService.load($stateParams.clipId);
                }
            },
            templateUrl: 'views/clip/clip-view-article.html'
        })
        .state('feed', {
            url: "/feed/:clipId",
            controller : "FeedCtrl",
            resolve: {
                feed_html: function(FeedService, $stateParams) {
                    return FeedService.load($stateParams.clipId);
                }
            },
            templateUrl: 'views/clip/feed.html'
        })
        .state('search', {
            url: '/search/:query',
            controller: 'SearchCtrl',
            templateUrl: 'views/search-new.html'
        })
        .state('search-users', {
            url: '/search-users/:query',
            controller: 'SearchCtrl',
            templateUrl: 'views/search-users.html'
        })
        .state('search-collections', {
            url: '/search-collections/:query',
            controller: 'SearchCtrl',
            templateUrl: 'views/search-collections.html'
        })
        .state('search-clips', {
            url : '/search-clips/:hash',
            resolve: {
                clips: function(SearchService) {
                    return SearchService.load();
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clips.html'
        })
        .state('add-collection', {
            url: '/add-collection/:action/:clipId',
            //cache: false,
            params: {
                action: 'account',
                clipId: ''
            },
            resolve: {
                collection: function() {
                    return {};
                }
            },
            controller: 'CollectionCtrl',
            templateUrl: 'views/collection/add.html'
        })
        .state('edit-collection', {
            url : '/edit-collection/:collectionId',
            resolve: {
                collection: function(CollectionService, $stateParams) {
                    return CollectionService.singleLoad($stateParams.collectionId);
                }
            },
            controller: 'CollectionCtrl',
            templateUrl: 'views/collection/add.html'
        })
        .state('comments', {
            url : '/comments/:clipId',
            resolve: {
                comments: function(CommentService, $stateParams) {
                    return CommentService.load($stateParams.clipId);
                },
                reclip_users: function(UserListService, $stateParams) {
                    return UserListService.getReclips($stateParams.clipId);
                },
                like_users: function(UserListService, $stateParams) {
                    return UserListService.getLikes($stateParams.clipId);
                }
            },
            controller: 'CommentCtrl',
            templateUrl: 'views/clip/comments.html'
        })
        .state('registration', {
            url : '/registration',
            controller: 'LoginCtrl',
            templateUrl: 'views/user/registration.html'
        })
        .state('contact', {
            url : '/contact/:userId',
            resolve: {
                account: function(AccountService, $stateParams) {
                    return AccountService.load($stateParams.userId);
                }
            },
            controller: 'ContactCtrl'
        })
        .state('shared', {
            url : '/shared/:collectionId',
            cache: false,
            controller: 'CollectionCtrl',
            resolve: {
                collection: function(CollectionService, $stateParams) {
                    return [CollectionService.tmp_collection];
                }
            },
            templateUrl: 'views/collection/shared.html',
        })
        .state('support', {
            url : '/support',
            controller: 'AboutCtrl',
            templateUrl: 'views/support.html',
        })
        .state('about-bazaarr', {
            url : '/about-bazaarr',
            controller: 'AboutCtrl',
            templateUrl: 'views/about-bazaarr.html',
        })
        .state('forgot-password', {
            url : '/forgot-password',
            cache: false,
            controller: 'ForgotPasswordCtrl',
            templateUrl: 'views/user/forgot-password.html',
        })
        .state('reset-password', {
            url : '/reset-password/:userId/:timestamp/:hash',
            cache: false,
            controller: 'ResetPasswordCtrl'
        })
        .state('email-notification', {
            url : '/email-notification',
            controller: 'EmailNotificationCtrl',
            cache: false,
            /*resolve: {
                notifications: function(EmailNotificationService) {
                    return EmailNotificationService.load();
                }
            },*/
            templateUrl: 'views/user/email-notification.html'
        })
        .state('login-link', {
            url : '/login-link/:hashLogin/:event',
            controller: 'LoginLinkCtrl'
        })
        .state('clip-view', {
            url: "/clip-view/:clipId",
            //cache: false,
            controller : "ClipCtrl",
            resolve: {
                clip: function(ClipService, $stateParams) {
                    return ClipService.load($stateParams.clipId);
                }
            },
            templateUrl: 'views/clip/clip-view.html'
        })
        .state('collection-view', {
            url: '/collection-view/:colId',
            resolve: {
                clips: function(ClipsService, $stateParams) {
                    return ClipsService.load("collection_clips", false, {"bid" : $stateParams.colId});
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clips-view.html'
        })
        .state('intro', {
            url: '/intro',
            templateUrl: 'views/intro.html'
        })
        .state('get-app', {
            url: '/get-app',
            templateUrl: 'views/get-app.html'
        })
        .state('clip-reclips', {
            url: '/clip-reclips/:clipId',
            resolve: {
                users: function(UserListService, $stateParams) {
                    return UserListService.getReclips($stateParams.clipId);
                }
            },
            controller: 'UserListCtrl',
            templateUrl: 'views/user/list.html'
        })
        .state('clip-likes', {
            url: '/clip-likes/:clipId',
            resolve: {
                users: function(UserListService, $stateParams) {
                    return UserListService.getLikes($stateParams.clipId);
                }
            },
            controller: 'UserListCtrl',
            templateUrl: 'views/user/list.html'
        })
        ;
    $urlRouterProvider.otherwise('/recent');

    $httpProvider.defaults.withCredentials = true;

    $ionicConfigProvider.views.maxCache(20);
    $ionicConfigProvider.views.forwardCache(true);
    //$ionicConfigProvider.views.transition('ios');

    $ionicConfigProvider.tabs.position('bottom');

    $ionicConfigProvider.navBar.positionPrimaryButtons('left');
    $ionicConfigProvider.navBar.alignTitle('center');

    if (ionic.Platform.isWebView() && ionic.Platform.isAndroid() && ionic.Platform.version() > 4.3) {
        $ionicConfigProvider.scrolling.jsScrolling(false);
    }

    $ionicConfigProvider.views.swipeBackEnabled(false);

    //rewrite ionic transition to swap clips from top to bottom
    $ionicConfigProvider.transitions.views.ios = function(enteringEle, leavingEle, direction, shouldAnimate) {
        function setStyles(ele, opacity, x, boxShadowOpacity, direction) {
            var css = {};
            css[ionic.CSS.TRANSITION_DURATION] = d.shouldAnimate ? '' : 0;
            css.opacity = opacity;
            if (boxShadowOpacity > -1) {
                css.boxShadow = '0 0 10px rgba(0,0,0,' + (d.shouldAnimate ? boxShadowOpacity * 0.45 : 0.3) + ')';
            }
            if (direction === "vertical") {
                css[ionic.CSS.TRANSFORM] = 'translate3d(0,' + x + '%,0)';
            }
            else {
                css[ionic.CSS.TRANSFORM] = 'translate3d(' + x + '%,0,0)';
            }
            ionic.DomUtil.cachedStyles(ele, css);
        }
        
        var d = {
            run: function(step) {
                if (direction == 'forward') {
                    setStyles(enteringEle, 1, (1 - step) * 99, 1 - step); // starting at 98% prevents a flicker
                    setStyles(leavingEle, (1 - 0.1 * step), step * -33, -1);
                
                } else if (direction == 'back') {
                    setStyles(enteringEle, (1 - 0.1 * (1 - step)), (1 - step) * -33, -1);
                    setStyles(leavingEle, 1, step * 100, 1 - step);

                } else if (direction == 'up') {
                    setStyles(enteringEle, 1, (1 - step) * 99, 1 - step, "vertical");
                    setStyles(leavingEle, (1 - 0.1 * step), step * -99, -1, "vertical");

                } else if (direction == 'down') {
                    setStyles(enteringEle, (1 - 0.1 * (1 - step)), (1 - step) * -99, -1, "vertical");
                    setStyles(leavingEle, 1, step * 100, 1 - step, "vertical");

                } else {
                    // swap, enter, exit
                    setStyles(enteringEle, 1, 0, -1);
                    setStyles(leavingEle, 0, 0, -1);
                }
            },
            shouldAnimate: shouldAnimate && (direction == 'forward' || direction == 'back' || direction == 'up' || direction == 'down')
        };

        return d;
    };
    
    $ionicConfigProvider.transitions.views.android = function(enteringEle, leavingEle, direction, shouldAnimate) {
        shouldAnimate = shouldAnimate && (direction == 'forward' || direction == 'back' || direction == 'up' || direction == 'down');

        function setStyles(ele, x, direction) {
            var css = {};
            css[ionic.CSS.TRANSITION_DURATION] = d.shouldAnimate ? '' : 0;
            if (direction === "vertical") {
                css[ionic.CSS.TRANSFORM] = 'translate3d(0,' + x + '%,0)';
            }
            else {
                css[ionic.CSS.TRANSFORM] = 'translate3d(' + x + '%,0,0)';
            }
            ionic.DomUtil.cachedStyles(ele, css);
        }

        var d = {
            run: function(step) {
                if (direction == 'forward') {
                    setStyles(enteringEle, (1 - step) * 99);
                    setStyles(leavingEle, step * -100);

                } else if (direction == 'back') {
                    setStyles(enteringEle, (1 - step) * -100);
                    setStyles(leavingEle, step * 100);
                
                } else if (direction == 'up') {
                    setStyles(enteringEle, (1 - step) * 99, "vertical");
                    setStyles(leavingEle, step * -100, "vertical");

                } else if (direction == 'down') {
                    setStyles(enteringEle, (1 - step) * -100, "vertical");
                    setStyles(leavingEle, step * 100, "vertical");
                
                } else {
                    // swap, enter, exit
                    setStyles(enteringEle, 0);
                    setStyles(leavingEle, 0);
                }
            },
            shouldAnimate: shouldAnimate
        };

        return d;
    };

    ngToastProvider.configure({
        verticalPosition: 'middle',
        horizontalPosition: 'center',
        maxNumber: 1
    });
})
.run(function($rootScope, $location, $state, $timeout, $ionicHistory, $ionicScrollDelegate, $ionicViewSwitcher, $cookies, $cordovaInAppBrowser, $cordovaStatusbar, $cordovaAppVersion, localStorageService,
DeviceAdapterService, MenuService, SearchService, UserService, AccountService, CollectionService, ConfigService, HttpService, ClipsService, StateService) {
    $rootScope.is_app = false;
    document.addEventListener("deviceready", function() {
        DeviceAdapterService.is_ready = true;
        $rootScope.is_app = true;

        feedback.initialize('74a134a0-c14a-11e4-be9a-eb0bc9144ec0');
        window.analytics.Start();
        /*
        if (typeof window.plugins.nativepagetransitions != "undefined") {
            // then override any default you want
            window.plugins.nativepagetransitions.globalOptions.duration = 500;
            window.plugins.nativepagetransitions.globalOptions.iosdelay = 500;
            window.plugins.nativepagetransitions.globalOptions.androiddelay = 500;
            window.plugins.nativepagetransitions.globalOptions.winphonedelay = 500;
            window.plugins.nativepagetransitions.globalOptions.slowdownfactor = 5;
            // these are used for slide left/right only currently
            //window.plugins.nativepagetransitions.globalOptions.fixedPixelsTop = 64;
            //window.plugins.nativepagetransitions.globalOptions.fixedPixelsBottom = 48;
        }*/
        $cordovaStatusbar.overlaysWebView(true);
        $cordovaStatusbar.style(1);

        $cordovaAppVersion.getAppVersion().then(function (version) {
            var current_version = version;
            var version = localStorageService.get("version");
            if (current_version !== version) {
                UserService.logout().then(function(data) {
                    HttpService.clearCache();
                    UserService.clearUser();
                }, function(reason) {
                    HttpService.clearCache();
                    UserService.clearUser();
                });
            }
            localStorageService.set("version", current_version);
        });
    }, false);

    document.addEventListener("pause", function() {
        window.analytics.Stop();
    });

    document.addEventListener("resume", function() {
        window.analytics.Start();
    });

    $rootScope.config = {
        screenHeight : window.innerHeight - 100
    };

    $rootScope.backState = [];
    //$rootScope.backEvent = false;

    $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){
        var active_menu = MenuService.getActiveMenu(toState.url);

        var index = -1;
        if (!!active_menu === true) {
            index = active_menu.id;
        }

        $rootScope.active          = [];
        $rootScope.active[index]   = "active";

        /*if ("search" === fromState.name.substring(0, 6)
                && "search" !== toState.name.substring(0, 6)) {
            SearchService.params = {};
        }*/

        $ionicScrollDelegate.resize();
        //!$rootScope.backEvent &&
        //var history = $ionicHistory.viewHistory();

        /*if (history.currentView) {
            if (fromState.name.indexOf("account") === 0 && toState.name.indexOf("account") === 0
                && fromParams.userId === toParams.userId) {
                history.currentView.stateId = history.currentView.stateId.replace(fromState.name, toState.name);
                history.currentView.stateName = toState.name;
                history.currentView.url = history.currentView.url.replace(fromState.url, toState.url);
                //$rootScope.backState.push({'state' : fromState.name, 'params' : fromParams});
            }
            if (fromState.name !== "clip" && toState.name === "clip") {
                p(history);
                $timeout(function() {
                    p(history);
                });
            }
        }*/


        /*
         * if next state equals back state, remove back state from history, to return to previous level #BA-1622
         */
        if ($rootScope.backState.length) {
            var last_state = $rootScope.backState[$rootScope.backState.length - 1];
            if (angular.isDefined(last_state.params) && angular.isDefined(last_state.params.colId) 
                    && last_state.state === toState.name && last_state.params.colId === toParams.colId) {
                $rootScope.backState.pop();
                $rootScope.backEvent = true;
            }
        }
        
        /*
         * if not back button event, not clip swiping, not account substate change
         * - add previous state to our own history stack
         */
        if (!$rootScope.backEvent && fromState.name && !(fromState.name === "clip" && toState.name === "clip")
                && fromState.name !== "login"
                && !(fromState.name.indexOf("account") === 0 && toState.name.indexOf("account") === 0
                    && fromParams.userId === toParams.userId)) {
            $rootScope.backState.push({'state' : fromState.name, 'params' : fromParams});
        }
        
        /* add our own history stack to localstorage, for enable history after browser reload */
        if (fromState.name && $rootScope.backState.length) {
            localStorageService.set("backState", $rootScope.backState);
        }
        $rootScope.backEvent = false;
    });
    
    window.addEventListener('popstate', function(e){
        
    }, false);

    $rootScope.goUserMenu = function(state) {
        $state.go(state);
    };

    $rootScope.getUserMenuActive = function(path) {
        if(typeof path === 'object') {
            for(var i = 0; i < path.length; i++) {
                if ($state.includes("account." + path[i])) {
                    return "active";
                }
            }
        } else {
            if ($state.includes("account." + path)) { // $location.path().substr(1) === path
                return "active";
            }
        }

        return "";
    };

    $rootScope.isUserMenu = function() {
        var path = $location.path().substr(1);

        if ($state.includes("collections") || path === "clips" || path === "likes") {
            return true;
        }

        return false;
    };

    $rootScope.back = function(direction) {
        direction = direction || "back";

        $ionicViewSwitcher.nextDirection(direction);
        $rootScope.backEvent = true;

        if (!$rootScope.backState.length) {
            $rootScope.backState = localStorageService.get("backState");
        }
        
        if ($rootScope.backState.length) {
            var back_state = $rootScope.backState.pop();

            if (back_state.state) {
                $state.go(back_state.state, back_state.params);
            } 
            else {
                $state.go("recent");
                //window.history.back();
            }
        }
        else {
            $state.go("recent");
            //window.history.back();
        }
    };

    $rootScope.backTwice = function() {
        window.history.go(-2);
    };

    $rootScope.isMyAccount = function() {
        if (!$rootScope.isLogin()) {
            return false;
        }

        return AccountService.getAccountId() === UserService.user.uid ? true : false;
    };

    $rootScope.isLogin = function() {
        if (!Object.keys(UserService.user).length) {
            return false;
        }

        return true;
    };

    $rootScope.openInApp = function(url, self, is_target) {
        if (!url) {
            return false;
        }
        
        var target = is_target ? "_system" : "_blank";

        var url = self ? ConfigService.server_url() + '/' + url : url;
        var options = DeviceAdapterService.getInAppBrowserConfig();
        if (!DeviceAdapterService.is_ready) {
            options.menubar = "yes";
            options.toolbar = "yes";
            console.log(options);
            if (window) {
                window.open(url, target, options);
            }
            return false;
        }

        $cordovaInAppBrowser.open(url, target, options)
        .then(function(event) {
            // success
        })
        .catch(function(event) {
            // error
        });
    };

    $rootScope.clearClipPager = function() {
        ClipsService.pager = {};
    }

    //window.onresize = function (event) {
    window.addEventListener("resize", function() {
        $rootScope.$broadcast("orientation:change");
        $ionicScrollDelegate.resize();
    }, false);

    $rootScope.$state       = $state;
    $rootScope.StateService = StateService;

    var session = localStorageService.get("session");

    if (session) {
        UserService.is_login    = true;
        UserService.user        = session.user;
        UserService.token       = session.token;
        CollectionService.user_collections  = session.collections;

        $cookies[session.session_name]    = session.sessid;
    }

    if (UserService.is_login) {
        $rootScope.user     = UserService.user;

        UserService.getToken().then(function(data) {
            UserService.token = data.data;
        });
    }

})

/*
 * #BA-1551 To fix scrolling inside comment field
 */
.directive('textarea', function(){
    return {
        restrict: 'E',
        scope: {
            'noIonic': '='
        },
        link: function(scope, element, attr){
            if(scope.noIonic){
                element.bind('touchend  touchmove touchstart', function(e){
                    e.stopPropagation();
                });
            }
        }
    }
});

angular.module('bazaarr').service('ConfigService', function(DeviceAdapterService, localStorageService) {
    this.url        = "https://www.bazaarr.org";

    this.server_url = function(){
        if(DeviceAdapterService.is_ready || "file:" == window.location.protocol || window.location.host.match(/bazaarr/g) == null){
            return localStorageService.get("server_url") || this.url;
        }

        return window.location.protocol + '//' + window.location.host;
    };

    this.connect_url = function(){
        return window.location.host;
    };

    this.setUrl = function(url){
        localStorageService.set("server_url", url);
        this.url = url;
    };
});

/*
 * set url redirect from outside links
 */
var handleOpenURL = function(url) {
    url = url.replace("bazaarr://", "");
    window.location.hash = "/" + url;
    //window.localStorage.setItem("external_load", url);
};

function CutString(string,limit){
    // temparary node to parse the html tags in the string
    this.tempDiv = document.createElement('div');
    this.tempDiv.id = "TempNodeForTest";
    this.tempDiv.innerHTML = string;
    // while parsing text no of characters parsed
    this.charCount = 0;
    this.limit = limit;
}

window.onresize = function() {
    var cv = document.getElementsByClassName('clip-view')[0];
    if(cv) {
        var c = document.getElementsByClassName('view-container')[0];
        if(c.clientWidth / c.clientHeight > 0.67) {
            cv.classList.add('tablet');
        } else {
            cv.classList.remove('tablet');
        }
    }
};;'use strict';

angular.module('bazaarr').controller('AddClipCtrl',
function($scope, $state, $q, $timeout, $window, $interval, $cordovaCamera, $cordovaInAppBrowser, $ionicPopup, $rootScope, $ionicLoading, $ionicScrollDelegate,
UserService, AddClipService, DeviceAdapterService, CollectionService, ClipService, AccountService, ClipsService, 
ToastService, HttpService, ImageService, ValidateService) {
    if (!UserService.is_login) {
        
        if($state.includes('reclip')) {
            UserService.post_login.redirect     = "reclip";
            UserService.post_login.params       = {clipId : $state.params.clipId};

            ToastService.showMessage("danger", "Please sign in to make reclips");
        }
        
        $state.go('login');
        return false;
    }
    var defaultClip = {
        category: {
            tid: '_none',
            name: 'None'
        },
        node: {
            currency: 'USD'
        }
    };

    $scope.is_ready = DeviceAdapterService.is_ready;

    $scope.allCurrency = currency;

    $scope.categories = [];
    
    $scope.old_bid = 0;

    $scope.clip = angular.copy(defaultClip);
// p($scope.clip);
    CollectionService.load(UserService.user.uid).then(function(data){
        $scope.collections = data.data;//CollectionService.user_collections;
        var default_collection = Object.keys(CollectionService.add_clip_collection).length ? CollectionService.add_clip_collection : data.data[0];
        CollectionService.add_clip_collection = {};
        
        if (angular.isUndefined($scope.clip.node.ph_bid) || $scope.clip.node.ph_bid === '') {
            $scope.setCollection(default_collection.bid, default_collection.name);
        }
        $ionicScrollDelegate.resize();
    });

    CollectionService.getCategories(2).then(function(data){
        $scope.categories = data.data;
    });

    $scope.deleteClip = function(nid) {
        var confirmPopup = $ionicPopup.confirm({
            title: 'Delete clip',
            template: 'Are you sure you want to delete this clip?',
            cssClass: 'confirm'
        });
        confirmPopup.then(function(res) {
            if(res) {
                AddClipService.deleteClip(nid).then(function(data){
                    ToastService.showMessage("success", "Clip successfully deleted!");
                    //$scope.clip         = angular.copy(defaultClip);
                    $scope.image_src    = null;
                    HttpService.clearCache();
                    
                    if (angular.isDefined($rootScope.backState[$rootScope.backState.length - 1]) 
                            && $rootScope.backState[$rootScope.backState.length - 1].state === "clip") {
                        $rootScope.backState.pop();
                    }
                    $rootScope.back();
                    
                    AddClipService.postProcessClipDelete($scope.clip.node.ph_bid);
                },
                function(reason) {
                    $scope.err_mess = reason.data;
                });
            } else {

            }
        });

    }


    $scope.setCollection = function(bid, name) {
        if(!bid){
            $scope.data = {};

            $scope.clip.node.ph_bid         = '';
            $scope.clip.node.ph_bid_search  = '';
            var setCollectionPopup          = $ionicPopup.show({
                title: 'Enter new collection',
                template: '<input type="text" ng-model="data.new_col">',
                scope: $scope,
                buttons: [
                    {
                        text: 'Cancel',
                        onTap: function(e) {
                            $scope.data = {};
                        }
                    },
                    {
                      text: 'Save',
                      type: 'button-positive',
                      onTap: function(e) {
                          if (!$scope.data.new_col) {
                              // error
                              e.preventDefault();
                          } else {
                              return $scope.data.new_col;
                          }
                      }
                    }
                ]
            });

            setCollectionPopup.then(function(res) {
                if(angular.isDefined(res)){
                    var new_col = {
                        name: res
                    };
                    CollectionService.add(new_col).then(function(data){
                        $scope.collections.push(data.data);
                        $scope.clip.node.ph_bid         = data.data.bid;
                        $scope.clip.node.ph_bid_search  = data.data.name;
                    }, function(reason) {
                        ToastService.showDrupalFormMessage("danger", reason.data);
                    });
                }
            });
            return;
        }

        $scope.clip.node.ph_bid         = bid;
        $scope.clip.node.ph_bid_search  = name;
    }

    $scope.addClip = function(clip, file) {
//p(clip);p(file);return
        $ionicLoading.show();
        if(clip.node.nid) {

            var node = {
                node: {
                    nid:            clip.node.nid,
                    uid:            clip.node.uid,
                    type:           'clip',
                    /*field_category: {
                        und: {
                            values: clip.category.tid || 0
                        }
                    },*/
                    ph_bid:         clip.node.ph_bid,
                    body_value:     clip.node.body_value,
                    reclip:         clip.node.reclip == "1" ? 1 : null,
                    currency:       clip.node.currency,
                    price_value:    clip.node.price_value,
                    ph_bid_title:   clip.node.ph_bid_search,
                    is_cover:       parseInt(clip.node.is_cover)
                }
            }
			
            if (angular.isDefined(clip.category.tid) && clip.category.tid) {
                node.node.field_category            = {};
                node.node.field_category.und        = {}
                node.node.field_category.und.values = clip.category.tid;
            }

            AddClipService.saveClip(node).then(function(data){
                ToastService.showMessage("success", "Clip successfully saved");
                //AccountService.updateCounts();//UserService.updateCounts('clips_count', 1);

                //$scope.clip = angular.copy(defaultClip);
                $scope.image_src = null;
                
                //after editing clip, load data from server, not from clip_list
                ClipService.load_from_server        = true;
                
                /*ClipService.clip.desc               = clip.node.body_value;
                ClipService.clip.price              = clip.node.price_value;
                ClipService.clip.collection_name    = clip.node.ph_bid_search;
                ClipService.clip.collection_id      = clip.node.ph_bid;*/

                //update full clip view and other views with this clip
                HttpService.clearCache();
                
                
                //$state.go('clip', {clipId: node.node.nid});
                $ionicLoading.hide();
                $rootScope.back();
                
                AddClipService.postProcessClipUpdate(clip.node.ph_bid, $scope.old_bid);
                if (clip.node.ph_bid !== $scope.old_bid) {
                    CollectionService.updateCollectionField($scope.old_bid, "clips_count", -1, "increment");
                    CollectionService.updateCollectionField(clip.node.ph_bid, "clips_count", 1, "increment");
                }
                //update cover of collection
                if (parseInt(clip.node.is_cover)) {
                    CollectionService.updateCollectionField(clip.node.ph_bid, "cover_img", clip.node.img_large, "update");
                }
            }, function(reason) {
                $ionicLoading.hide();
                ToastService.showDrupalFormMessage("danger", reason.data);
            });
            return;
        }

        AddClipService.addFile(file).then(function(data){
            clip.node.type              = "clip";
            clip.node.field_clip_image  = {"und" : [{"fid" : data.data.fid}]};
            clip.node.img_large         = data.data.url;
            
            if(clip.category) {
                clip.node.field_category  = {"und" : {"values" : clip.category.tid}};
            }
            delete clip.category;
            delete clip.currency;
			
            AddClipService.saveClip(clip).then(function(data){
                //$scope.clip = angular.copy(defaultClip);
                $scope.image_src = null;

                if (!DeviceAdapterService.is_ready) {
                    var canvas = document.getElementById('canvas');
                    if (angular.isDefined(canvas)) {
                        canvas.style.display    = 'none';
                    }
                }

                AccountService.updateCounts();//updateCounts('clips_count', 1);
                HttpService.clearCache();
                $ionicLoading.hide();
                ToastService.showMessage("success", "Clip successfully added!");

                $rootScope.backEvent = true;
                $rootScope.backState.push({'state' : 'recent'});
                $state.go('clip', {clipId: data.data.nid});
                
                AddClipService.postProcessClipInsert(clip.node.ph_bid, data.data.nid);
                
                //update cover of collection
                if (parseInt(clip.node.is_cover)) {
                    CollectionService.updateCollectionField(clip.node.ph_bid, "cover_img", clip.node.img_large, "update");
                }
            }, function(reason) {
                $ionicLoading.hide();
                //ToastService.showMessage("danger", reason.data);
                ToastService.showDrupalFormMessage("danger", reason.data);
                //$scope.err_mess = reason.data;
            })
        },
        function(reason) {
            $ionicLoading.hide();
            if (angular.isDefined(reason.data)) {
                ToastService.showMessage("danger", reason.data);
            }
            else {
                ToastService.showDrupalFormMessage("danger", reason.data);
            }
        });
    }

    $scope.files = []
    $scope.changedFile = function(element) {
        $scope.$apply(function($scope) {
            // Turn the FileList object into an Array
            setCanvasImage(element);
        });
    };

    $scope.openPhotoSourcePopup = function() {
        $scope.photo_source_popup = $ionicPopup.show({
            title: 'Select source',
            templateUrl: 'views/popups/photo_source.html',
            scope: $scope
        });
    };

    $scope.closeImagePopup = function() {
        $scope.photo_source_popup.close();
    }

    $scope.addPhoto = function(source_type_id) {
        $scope.photo_source_popup.close();
        if (!DeviceAdapterService.is_ready) {
            return false;
        }
        $cordovaCamera.getPicture(DeviceAdapterService.getCameraOptions(source_type_id)).then(function(imageData) {
            $scope.file.file = imageData;
            $scope.image_src = "data:image/jpeg;base64," + imageData;
        }, function(err) {
            ToastService.showMessage("danger", err);
        });
    }

    $scope.reclipClip = function(clip, bid, cacheClean) {
        if(!clip){
            $state.go('add-collection', {action:'reclip', clipId: $state.params.clipId});
            return false;
        }
        $ionicLoading.show();
        var reclip = ClipService.formatReclip(clip, bid);
        AddClipService.addReclip(reclip).then(function(data){
            ToastService.showMessage("success", "Reclip succesfully added");
            $scope.reclip = {};
            HttpService.clearCache();
            $ionicLoading.hide();
            
            $rootScope.backEvent = true;
            $rootScope.backState.push({'state' : 'recent'});
            $state.go('clip', {clipId: data.data.nid});
            
            AddClipService.postProcessClipInsert(bid);
        },
        function(reason) {
            ToastService.showMessage("danger", reason.data);
        });
    };

    $scope.scrollToAdvance = function() {
        $ionicScrollDelegate.scrollBottom();
    };

    var clipit_loop 		= 0;
    var button_added 		= false;
    
    var ref = {};
    
    $scope.openUrlPopup = function() {
        $scope.photo_source_popup.close();
        /*$scope.url = {};
        $scope.url.data = "";
        $scope.url_popup = $ionicPopup.show({
            title: 'Images search',
            template: '<input type="text" placeholder="Enter url" ng-model="url.data">',
            scope: $scope,
            buttons: [
                {
                    text: 'Cancel'
                },
                {
                    text: 'Search',
                    type: 'button-positive',
                    onTap: function(e) {
                        if (!ValidateService.validate($scope.url.data, "url")) {
                            e.preventDefault();
                            return false;
                        }
                        searchImages($scope.url.data);
                    }
                }
            ]
        });*/
        ref = $window.open('https://google.com', '_blank', 'location=yes,clearcache=no,clearsessioncache=no');
        ref.addEventListener('loadstart', function() {
            button_added = false;
            clearInterval(clipit_loop);
        });
        ref.addEventListener('loadstop', addClipItBtn);
        ref.addEventListener('loaderror', addClipItBtn);
        ref.addEventListener('exit', function() {
            button_added = false;
            clearInterval(clipit_loop);
            ref.removeEventListener('loadstart');
            ref.removeEventListener('loadstop');
            ref.removeEventListener('loaderror');
            ref.removeEventListener('exit');
        });
		
		//ref.show();
        /*$cordovaInAppBrowser.open("https://google.com", "_blank", DeviceAdapterService.getInAppBrowserConfig())
        .then(function(event) {
			
        });*/
    };
    
    /*$rootScope.$on('$cordovaInAppBrowser:loadstart', function(e, event){
        button_added = false;
        clearInterval(clipit_loop);

        //$cordovaInAppBrowser.executeScript({
        //    code: "localStorage.setItem('url', '')"
        //});
    });

    $rootScope.$on('$cordovaInAppBrowser:loadstop', function(e, event){
        addClipItBtn();
    });

    $rootScope.$on('$cordovaInAppBrowser:loaderror', function(e, event){
        addClipItBtn();
    });

    $rootScope.$on('$cordovaInAppBrowser:exit', function(e, event){
        clearInterval(clipit_loop);
        button_added = false;
    });*/

    function addClipItBtn() {
        button_added = false;
        clearInterval(clipit_loop);
        
        $timeout(function(){
            ref.insertCSS({
                code: '.bazaarr-clip-it{width:100%;top:100%;position:fixed;bottom:0;padding:0;box-sizing:border-box;z-index:99999;background:#fff;}.bazaarr-clip-it.expanded{top:0; overflow-y: scroll;} .bazaarr-clip-it.expanded > span {display: none;} .images-list {text-align: center; padding-top: 46px;}.bazaarr-clip-it .cancel-btn{display:none}.bazaarr-clip-it.expanded .cancel-btn{display:block;position:absolute;top:0;right:0;font-size:20px;padding:10px;color:#43a5a6;text-decoration:none}.bazaarr-clip-it span{display:block;position:fixed;bottom:0;left:0;font-size:22px;background:#43a5a6;color:#FFF;text-align:center;text-decoration:none;width:100px;padding:10px;margin:20px;box-sizing:border-box}.bazaarr-clip-it img{  margin: 0 1%; max-width: 48%; margin-top: 20px;} .bazaarr-clip-it.expanded .error-message {font-size: 16px; max-width: 80%; margin: 0 auto;}'
            }, function() {
                //alert("addcss");
                $timeout(function(){
                    ref.executeScript({
                        code: 'localStorage.setItem("clip",{});var bazaarrClipItShow=function(){var a=document.getElementsByClassName("bazaarr-clip-it")[0];if(!a.classList.contains("expanded")){a.classList.add("expanded");for(var e=document.querySelectorAll("img"),t=!1,r=0;r<e.length;r++){var i=e[r].parentNode.getAttribute("href"),n="";null!==i&&(n=bazaarrGetQueryVariable(i,"imgurl"));var l=n||e[r].src,t=r===e.length-1?!0:!1;bazaarrLoadImage(l,t)}}},bazaarrClipImage=function(a){var e={};e.img=a.src,e.url=window.location.href,localStorage.setItem("clip",JSON.stringify(e))},bazaarrClipItHide=function(a){var e=document.getElementsByClassName("bazaarr-clip-it")[0];e.classList.remove("expanded");var t=e.getElementsByClassName("images-list")[0];t.innerHTML="",a.preventDefault()},bazaarrClipItInsert=function(){if(!document.getElementsByClassName("bazaarr-clip-it").length>0){var a=document.createElement("div");a.className="bazaarr-clip-it",a.innerHTML=\'<span onclick="bazaarrClipItShow()">Clip It!</span><a href="#" class="cancel-btn" onclick="bazaarrClipItHide(event)">Cancel</a><div class="images-list"></div>\',document.body.insertBefore(a,document.body.firstChild)}},bazaarrGetQueryVariable=function(a,e){for(var t=a.substring(a.indexOf("?")+1).split("&"),r=0;r<t.length;r++){var i=t[r].split("=");if(decodeURIComponent(i[0])==e)return decodeURIComponent(i[1])}},bazaarrLoadImage=function(a,e){var t=document.getElementsByClassName("bazaarr-clip-it")[0],r=t.getElementsByClassName("images-list")[0],i=new Image;i.onload=function(){i.width>320&&i.height>320&&(r.appendChild(i),i.addEventListener("click",function(){bazaarrClipImage(this)})),e&&!r.querySelectorAll("img").length&&(r.innerHTML=\'<div class="error-message">Image not found or is too small to add - it should be more then 320*320</div>\')},i.src=a};bazaarrClipItInsert();'
                    }, function() {
                        button_added = true;
                        //alert("addjs");
                    });
                }, 500);
            });
        }, 1500);
        
        clipit_loop = setInterval(function() {
            if (button_added) {
                //alert("check");
                ref.executeScript({
                    code: 'localStorage.getItem("clip")'
                }, function(values) {
                    //alert("checkjs");
                    var clip = JSON.parse(values[0]);
                    if (Object.keys(clip).length) { // url && url.length > 10
                        ref.close();
                        //$scope.selectWebImage(url);
                        setClipFromWeb(clip);
                    }
                });
            }
        }, 500);

        /*
        $cordovaInAppBrowser.insertCSS({
            code: '.bazaarr-clip-it{width:100%;top:100%;position:fixed;bottom:0;padding:0;box-sizing:border-box;z-index:99999;background:#fff;transition:all 1s;}.bazaarr-clip-it.expanded{top:0; overflow-y: scroll;} .bazaarr-clip-it.expanded > span {display: none;} .images-list {text-align: center; padding-top: 46px;}.bazaarr-clip-it .cancel-btn{display:none}.bazaarr-clip-it.expanded .cancel-btn{display:block;position:absolute;top:0;right:0;font-size:20px;padding:10px;color:#43a5a6;text-decoration:none}.bazaarr-clip-it span{display:block;position:fixed;bottom:0;left:0;font-size:22px;background:#43a5a6;color:#FFF;text-align:center;text-decoration:none;width:100px;padding:10px;margin:20px;box-sizing:border-box}.bazaarr-clip-it img{  margin: 0 1%; max-width: 48%; margin-top: 20px;} .bazaarr-clip-it.expanded .error-message {font-size: 16px; max-width: 80%; margin: 0 auto;}'
        }).then(function(){
            p("loadcss");
            $cordovaInAppBrowser.executeScript({
                code: 'localStorage.setItem("url","");var bazaarrClipItShow=function(){var e=document.getElementsByClassName("bazaarr-clip-it")[0];if(!e.classList.contains("expanded")){e.classList.add("expanded");for(var a=e.getElementsByClassName("images-list")[0],t=document.querySelectorAll("img"),r=0;r<t.length;r++){var l=new Image;l.src=t[r].src,l.addEventListener("click",function(){bazaarrClipImage(this)}),l.width>320&&l.height>320&&a.appendChild(l)}a.querySelectorAll("img").length||(a.innerHTML=\'<div class="error-message">Image not found or is too small to add - it should be more then 320*320</div>\')}},bazaarrClipImage=function(e){localStorage.setItem("url",e.src)},bazaarrClipItHide=function(e){var a=document.getElementsByClassName("bazaarr-clip-it")[0];a.classList.remove("expanded");var t=a.getElementsByClassName("images-list")[0];t.innerHTML="",e.preventDefault()},bazaarrClipItInsert=function(){if(!document.getElementsByClassName("bazaarr-clip-it").length>0){var e=document.createElement("div");e.className="bazaarr-clip-it",e.innerHTML=\'<span onclick="bazaarrClipItShow()">Clip It!</span><a href="#" class="cancel-btn" onclick="bazaarrClipItHide(event)">Cancel</a><div class="images-list"></div>\',document.body.insertBefore(e,document.body.firstChild)}};bazaarrClipItInsert();'
            }).then(function() {
                button_added = true;
                p("loadbutton");
                clipit_loop = setInterval(function() {
                    if (button_added) {
                        $cordovaInAppBrowser.executeScript({
                            code: "localStorage.getItem('url')"
                        }).then(function(values) {
                            var url = values[0];
                            if (url && url.length > 10) {
                                $cordovaInAppBrowser.close();
                                $scope.selectWebImage(url);
                            }
                        });
                    }
                }, 1000);
            });
        });*/
    }
    
    function setClipFromWeb(clip) {
    	$scope.selectWebImage(clip.img);
        $scope.clip.node.source_url = clip.url.substring(0, 255);
    }

    $scope.selectWebImage = function(url) {
        $ionicLoading.show();
        $timeout(function(){
            ImageService.convertImgToBase64URL(url).then(function(data) {
                $scope.file.file = data;
                $scope.image_src = data;
                $ionicLoading.hide();
            }, function() {
                $ionicLoading.hide();
            });
        }, 1000);
    };

    $scope.file = {};

    if($state.includes('reclip')){
        ClipService.nodeLoad($state.params.clipId).then(function(data){
            $scope.reclip       = angular.copy(data.data[0]);
            $scope.image_src    = $scope.reclip.img;
            if(CollectionService.collectionId){
                $scope.reclipClip($scope.reclip, CollectionService.collectionId, 1);
                CollectionService.collectionId = 0;
            }
        });

    }

    if($state.includes('edit-clip')){
        $scope.clip.node        = {};
        $scope.clip.node.nid    = $state.params.clipId
        ClipService.nodeLoad($state.params.clipId).then(function(data){
            if(!data.data[0]){
                ToastService.showMessage("danger", "No such clip");
                $rootScope.back();
                return false;
            }
            $scope.old_bid = parseInt(data.data[0].collection_id);
            $scope.clip.node = data.data[0];
            if($scope.clip.node.uid != UserService.user.uid) {
                $state.go('recent');
            }

            $scope.clip.node.ph_bid         = $scope.clip.node.collection_id;
            $scope.clip.node.ph_bid_title   = $scope.clip.node.collection_name;
            $scope.clip.node.body_value     = $scope.clip.node.desc;
            $scope.clip.category.tid        = $scope.clip.node.category.tid || null;

            if ($scope.clip.category.tid !== null && $scope.clip.category.tid) {
                //TODO: broadcast category name
                $timeout(function(){
                    angular.forEach($scope.categories, function(value, key) {
                        if (value.tid === $scope.clip.category.tid) {
                            $scope.clip.category.name = value.name;
                        }
                    });
                }, 1000);
            }

            $scope.clip.node.currency       = $scope.clip.node.currency.code;
            $scope.clip.node.price_value    = parseFloat($scope.clip.node.price) || "";
        });
    }

    function setCanvasImage(element, _url){
        var canvas      = document.getElementById('canvas'),
            MAX_WIDTH   = document.getElementById('canvas_wrapp').clientWidth,
            img         = new Image();

        var f           = element.files[0],
            url         = window.URL || window.webkitURL,
            src         = url.createObjectURL(f);

        var FR= new FileReader();
        FR.onload = function(e) {
            $scope.file.file    = e.target.result;
            img.src             = src;
        };
        FR.readAsDataURL(f);
        img.onload = function() {
            if (img.width > MAX_WIDTH) {
                img.height *= MAX_WIDTH / img.width;
                img.width   = MAX_WIDTH;
            }
            var ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display    = 'block';
            canvas.width            = img.width;
            canvas.height           = img.height;

            ctx.drawImage(img, 0, 0, img.width, img.height);
            url.revokeObjectURL(src);
        };
    }

    function searchImages(url) {
        AddClipService.searchImages(url).then(function(data) {
            //$scope.url_popup.close();
            //data.data.imgs = data.data.imgs.slice(0, 9);
            checkImages(data.data.imgs);
        }, function(reason) {
            //$scope.url_popup.close();
            ToastService.showMessage("danger", reason.data);
        });
    };

    function checkImages(imgs) {
        $ionicLoading.show({duration : 0});
        var prom = []
        angular.forEach(imgs, function(value, key) {
            prom.push(ImageService.checkSizeFromUrl(value));
        });

        $q.all(prom).then(function (data) {
            $scope.imgs = [];
            angular.forEach(data, function(value, key) {
                if (value.status === 1) {
                    $scope.imgs.push(value.url);
                }
            });
            if ($scope.imgs.length === 0) {
                ToastService.showMessage("danger", "Image not found or is too small to add - it should be more then 320*320");
            }
            else {
                openImagesPopup();
            }
            $ionicLoading.hide();
        });
    };

    function openImagesPopup() {
        $scope.images_popup = $ionicPopup.show({
            title: 'Select Image',
            templateUrl: 'views/popups/images.html',
            scope: $scope,
            buttons: [
                {
                    text: 'Cancel'
                }
            ]
        });
    };
});

angular.module('bazaarr').service('AddClipService', function($q, $ionicLoading, HttpService, ImageService) {

    this.deleteClip = function(nid) {
        HttpService.view_url = "node/" + nid;

        return HttpService.dell();
    }

    this.addReclip = function(params) {
        HttpService.view_url = "reclip";
        HttpService.params   = params;

        return HttpService.post();
    };

    this.saveClip = function(clip) {
        HttpService.view_url = "node";
        HttpService.params   = clip;
        if(clip.node.nid){
            HttpService.view_url += '/' + clip.node.nid;
            return HttpService.put();
        }

        return HttpService.post();
    };

    this.addFile = function(file) {
        if (angular.isUndefined(file.file)) {
            return $q.reject({'data' : 'Image field is required'});
        }
        var that = this;
        return ImageService.checkSize(file.file).then(function() {
            return that.sendFile(file);
        }, function(reason) {
            return $q.reject({'data' : reason.data});
        });
    };

    this.sendFile = function(file) {
        file.filename = "device.jpg";
        file.filepath = "public://clip_images/" + file.filename;

        HttpService.view_url = "file";
        HttpService.params   = file;
        return HttpService.post();
    };

    this.searchImages = function(url) {
        $ionicLoading.show();
        HttpService.view_url = "search-web-images";
        HttpService.params   = {"url" : url};
        var promise = HttpService.post();

        promise.then(function() {
            $ionicLoading.hide();
        }, function() {
            $ionicLoading.hide();
        });

        return promise;
    };
    
    this.postProcessClipInsert = function(bid, nid) {
        var data = {"action" : "insert", "nid" : nid};
        this.postProcessClip(bid, data);
    };
    
    this.postProcessClipUpdate = function(bid, old_bid) {
        if (bid === old_bid) {
            return false;
        }
        var data = {"action" : "update", "old_bid" : old_bid};
        this.postProcessClip(bid, data);
    };
    
    this.postProcessClipDelete = function(bid) {
        var data = {"action" : "delete"};
        this.postProcessClip(bid, data);
    };
    
    this.postProcessClip = function(bid, data) {
        HttpService.view_url = "collection/collection_image/" + bid;
        HttpService.params   = {"data": data};
        HttpService.post();
    };
});

angular.module('bazaarr').service('ImageService', function($q, $ionicLoading, DeviceAdapterService) {
    this.checkSize = function(file_base64) {
        var def = $q.defer();

        if (file_base64.length > 10000000) {
            def.reject({'data' : 'Image size must be less than 10 MB'});
        }

        var i = new Image();
        i.onload = function(){
            if (i.width < 320 || i.height < 320) {
                def.reject({'data' : 'Size of image is ' + i.width + " x " + i.height + '. Your image must be more than 320 x 320'});
            }
            def.resolve();
        };
        i.onerror = function () {
            def.reject({'data' : 'Error uploading photo'});
        };
        i.src = file_base64.indexOf("base64") === -1 ? "data:image/png;base64," + file_base64 : file_base64;

        return def.promise;
    };

    this.checkSizeFromUrl = function(url) {
        var def = $q.defer();

        var i = new Image();
        i.onload = function(){
            if (i.width < 320 || i.height < 320) {
                def.resolve({'status' : 0});
            }
            else {
                def.resolve({'status' : 1, 'url' : url});
            }
        };
        i.onerror = function () {
            def.resolve({'status' : 0});
        };
        i.src = url;

        return def.promise;
    };

    this.convertImgToBase64URL = function(url, outputFormat) {
        var def = $q.defer();

        var img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function(){
            var canvas = document.createElement('CANVAS'),
            ctx = canvas.getContext('2d'), dataURL;
            canvas.height = img.height;
            canvas.width = img.width;
            ctx.drawImage(img, 0, 0);
            
            var toDataURLFailed = false;
            try {
            	dataURL = canvas.toDataURL("image/jpeg", 1);
            }
            catch(e) {
            	toDataURLFailed = true; // android may generate png
            }

            if ((toDataURLFailed || dataURL.slice(0, "data:image/jpeg".length) !== "data:image/jpeg")) {
            	try {
                    var encoder = new JPEGEncoder();
                    dataURL = encoder.encode(ctx.getImageData(0, 0, img.width, img.height), 100);
            	}
                catch(e) { 
                	def.reject({'data' : 'Error uploading image'});
                }
            }
            
            //dataURL = canvas.toDataURL();
            //dataURL = dataURL.replace("data:image/png;base64,", "data:image/jpeg;base64,");
            def.resolve(dataURL);
            canvas = null;
        };
        img.onerror = function () {
            def.reject({'data' : 'Error uploading image'});
        };
        img.src = url;

        return def.promise;
    };
});;'use strict';
angular.module('bazaarr').controller('ClipCtrl',
function($scope, $state, $timeout, $rootScope, $ionicViewSwitcher, $ionicPopover, $ionicPopup, $cordovaSocialSharing,
ClipsService, ClipService, UserService, FollowService, AccountService, ToastService, StateService, ConfigService, clip) {
    /*SliderService.load().then(function(data) {
        if (data.data) {
            $scope.slider       = SliderService.buildNew(data.data);

            if ($scope.slider.index === -1) {
                $scope.slide    = false;
            }
            else {
                $scope.slide    = true;

                ClipService.clip = $scope.slider.clips[$scope.slider.index];
            }
        }
        else {
            $scope.slide    = false;
        }
    }, function(reason) {
        ToastService.showMessage("danger", "Error");
    });*/
    
    //$scope.slide        = false;
    if (angular.isDefined(clip.data) && clip.data[0]) {
        $scope.clip         = clip.data[0];
        $scope.action       = false;
        //$scope.back_view    = $scope.clip.page_list;
    }
    
    $scope.orientation_changed = false;
    //$scope.loadClip();

//p($scope.slide_clips);
    $scope.$on('clip:like', function(event) {
        $scope.clipActionLike();
    });
    
    $scope.$on('clip:block', function(event) {
        $scope.clipActionBlock();
    });
    
    $scope.$on('clip:reclip', function(event) {
    	$scope.clipActionReclip(ClipService.clip.nid);
    });

    /*$scope.loadClip = function() {
        var clip = SliderService.getClip();
        if (clip.nid) {
            ClipService.clip    = clip;
            $scope.clip         = ClipService.clip;
        }
        else {
            ClipService.load($state.params.clipId).then(function(data){
                ClipService.clip = ClipsService.preRenderSingle(data.data[0]);//data.data[0];
                $scope.clip = ClipService.clip;
                //data.data[0] = $scope.prepareSingle(data.data[0]);
            });
        }
    };*/

    /*$scope.prepareSingle = function(data) {
        data.source_domain = ArrayService.url_domain(data.source_url);

        data.desc = ClipsService.hashtagUrlWrap(data.desc);

        return data;
    };*/

    $scope.nextSlide = function() {
        if (!$scope.action) {
            $timeout(function(){
                var prev_clip_nid = ClipService.clip.nid;
                var clip = ClipService.getClip(1);
                $ionicViewSwitcher.nextDirection('up');
                if (Object.keys(clip).length) {
                    goToClip(clip);
                }
                else {
                    ToastService.showMessage("danger", "No more clips in collection");
                }
                $scope.action = false;
            }, 200);
        }
        $scope.action = true;
    };

    $scope.prevSlide = function() {
        if (!$scope.action) {
            $timeout(function(){
                var clip = ClipService.getClip(-1);
                $ionicViewSwitcher.nextDirection('down');
                goToClip(clip);
                $scope.action = false;
            }, 200);
        }
        $scope.action = true;
    };

    function goToClip(clip) {
        /*$ionicHistory.nextViewOptions({
            disableBack: true
        });*/
        if (clip.nid) {
            //ClipService.clip = clip;
            $state.go("clip", {"clipId" : clip.nid});
        }
        //$ionicScrollDelegate.$getByHandle('clipSingle').scrollTop(true);
    }

    $scope.checkSlide = function(index) {
        var page_list = this.page_list || ClipsService.page_api_url;//this.clip.page_list || ClipsService.page_api_url;
        var clips = ClipsService.clips[page_list];
        var clip = {};
        angular.forEach(clips, function(value, key) {
            if (value.nid === $state.params.clipId && angular.isDefined(clips[key + index])) {
                clip = clips[key + index];
            }
        });
        if(Object.keys(clip).length) {
            return true;
        } else {
            return false;
        }
    };

    $scope.isList = function() {
        if(ClipService.page_list) {
            return true;
        }
    };


    /*$scope.clipChange = function($index) {
        ClipService.clip        = $scope.slider.clips[$index];
        $state.params.clipId    = ClipService.clip.nid;

        $ionicScrollDelegate.$getByHandle('clipSingle').scrollTop(true);

        if ($scope.slider.counter === ($index + 1)) {
            $ionicLoading.show();
            SliderService.loadMore().then(function(data) {
                $scope.slider       = SliderService.build();
                $scope.slider.index = $index;
                $timeout(function(){
                    $ionicSlideBoxDelegate.update();
                }, 1);
                $ionicLoading.hide();
            });
        }
        else {

            //$scope.slider.index = -1;


            $timeout(function(){
                $scope.slider.clips = SliderService.build().clips;
                //$ionicSlideBoxDelegate.slide($scope.slider.index, 0);

                $ionicSlideBoxDelegate.update();
            }, 1);
        }
    };*/

    // Reclip action
    $scope.clipActionReclip = function(nid) {
        if($scope.clip_actions_popup) {
            $scope.clip_actions_popup.close();
        }
        if (!UserService.is_login) {
            UserService.post_login.redirect     = "clip";
            UserService.post_login.params       = {clipId : ClipService.clip.nid};
            UserService.post_login.broadcast    = "clip:reclip";

            ToastService.showMessage("danger", "Please sign in to make reclips");
            $state.go('login');
            return false;
        }
        if(!nid) {
            nid = $state.params.clipId;
        }
        if (parseInt(ClipService.clip.uid) === parseInt(UserService.user.uid)) {
            ToastService.showMessage("danger", "You cannot reclip your clip");
            return false;
        }
		
        $state.go('reclip', {clipId: nid});
    };

    // Edit action
    $scope.clipActionEdit = function(nid) {
        if($scope.clip_actions_popup) {
            $scope.clip_actions_popup.close();
        }
        $scope.clipPopover.hide();
        if(!nid) {
            nid = $state.params.clipId;
        }
        $state.go('edit-clip', {clipId: nid});
    };

    // Go to comments
    $scope.clipActionComments = function(nid) {
        if($scope.clip_actions_popup) {
            $scope.clip_actions_popup.close();
        }
        if(!nid) {
            nid = $state.params.clipId;
        }
        $state.go('comments', {clipId: nid});
    };

    // Like action
    $scope.clipActionLike = function() {
        if($scope.clip_actions_popup) {
            $scope.clip_actions_popup.close();
        }
        if (!UserService.is_login) {
            UserService.post_login.redirect     = "clip";
            UserService.post_login.params       = {clipId : ClipService.clip.nid};
            UserService.post_login.broadcast    = "clip:like";

            ToastService.showMessage("danger", "Please sign in to like Clips");
            $state.go('login');
            return false;
        }

        if(ClipService.clip.voted){
            ClipService.clip.voted = 0;
        } else {
            ClipService.clip.voted = 1;
        }

        if(ClipService.clip.voted){
            ClipService.clip.like_count = (parseInt(ClipService.clip.like_count) || 0) + 1;
        } else {
            ClipService.clip.like_count = (parseInt(ClipService.clip.like_count) - 1 || 0);
        }

        //AccountService.updateCounts();//UserService.updateCounts('liked_count', ClipService.clip.voted);
        AccountService.updateCounters('liked_count', ClipService.clip.voted);

        ClipService.likeClip(ClipService.clip);
    };

    // Block
    $scope.clipActionBlock = function() {
        if (!UserService.is_login) {
            UserService.post_login.redirect     = "clip";
            UserService.post_login.params       = {clipId : ClipService.clip.nid};
            UserService.post_login.broadcast    = "clip:block";

            ToastService.showMessage("danger", "Please sign in to make reports on Clip");
            if($scope.clip_actions_popup) {
                $scope.clip_actions_popup.close();
            }
            if($scope.clipPopover) {
                $scope.clipPopover.hide();
            }
            $state.go('login');

            return false;
        }
        ClipService.blockClip().then(function(data){
            ClipService.clip.bloked = data.data.block || 0;
            ClipsService.updateClipInList(ClipService.clip);
            if($scope.clip_actions_popup) {
                $scope.clip_actions_popup.close();
            }
            $scope.clipPopover.hide();
        });
    };

    $scope.clipFollowUser = function() {
        if (!UserService.is_login) {

            ToastService.showMessage("danger", "Please sign in to follow User");
            $state.go('login');
            if($scope.clipPopover) {
                $scope.clipPopover.hide();
            }
            return false;
        }

        var type = ClipService.clip.is_follow_user ? 0 : 1;

        FollowService.followUser(ClipService.clip.uid, type).then(function(data){
            ClipService.clip.is_follow_user = type;
            FollowService.followUserCallback(type);//AccountService.updateCounts();//UserService.updateCounts('following_count', type);

            if($scope.clip_actions_popup) {
                $scope.clip_actions_popup.close();
            }

            $scope.clipPopover.hide();
            ToastService.showMessage("success", data.data.message);
        });
    };

    $scope.clipFollowCollection = function() {
        if (!UserService.is_login) {

            ToastService.showMessage("danger", "Please sign in to follow Collection");
            $state.go('login');
            if($scope.clipPopover) {
                $scope.clipPopover.hide();
            }
            return false;
        }
        var type = ClipService.clip.is_follow_collection ? 0 : 1;
        FollowService.followCollection(ClipService.clip.collection_id, type).then(function(data){
            ClipService.clip.is_follow_collection = type;
            if($scope.clip_actions_popup) {
                $scope.clip_actions_popup.close();
            }
            $scope.clipPopover.hide();
            ToastService.showMessage("success", data.data.message);
            FollowService.followUserCallback(type);
        });
    };

    $scope.checkBlocked = function(bloked) {
        return bloked === 0 ? false : true;
    };

    $scope.isOwner = function () {
        if (!ClipService.clip) {
            return false;
        }
        
        return ClipService.clip.owner.id === UserService.user.uid;
    };

    $scope.isLiked = function () {
        if (!ClipService.clip || angular.isUndefined(ClipService.clip.voted)) {
            return "";
        }
        
        return ClipService.clip.voted ? "liked" : "";
    };

    $scope.isFollowUser = function () {
        if (!ClipService.clip) {
            return true;
        }
        return ClipService.clip.is_follow_user ? true : false;
    };

    $scope.isFollowCollection = function () {
        if (!ClipService.clip) {
            return true;
        }
        return ClipService.clip.is_follow_collection ? true : false;
    };

    $scope.isReport = function() {
        if (angular.isUndefined(ClipService.clip)) {
            return false;
        }

        if (angular.isDefined(ClipService.clip.bloked) && 0 === ClipService.clip.bloked) {
            return true;
        }

        return false;
    };

    $scope.canReclip = function() {        
        if ($scope.isOwner()) {
            return false;
        }
        
        if (parseInt(ClipService.clip.reclip) === 1) {
            return false;
        }
        
        if (parseInt(ClipService.clip.bloked) === 0) {
            return false;
        }

        if (parseInt(ClipService.clip.shared_collection) === 1) {
            return false;
        }

        return true;
    };

    $scope.backClip = function() {
        /*var list_view = ClipService.page_list || "recent";// || $scope.clip.page_list;

        var history         = $ionicHistory.viewHistory();
        var view            = $ionicHistory.currentView();
        var counter         = 0;
        var keepGoing       = true;
        var state           = "";
        var back_view_id    = "";

        if (Object.keys(history.views).length > 1) {
            Object.keys(history.views).reverse().forEach(function(key) {
                if (keepGoing) {
                    var value = history.views[key];
                    if (view === value || (key === back_view_id && value.stateName === "clip")) {
                        back_view_id = value.backViewId;
                        counter--;
                    }
                    else if (key === back_view_id && value.stateName !== "clip") {
                        state = value.stateName;
                        keepGoing = false;
                    }
                }
            });
        }

        //TODO: connect with ClipsService
        var params = {};
        if (list_view === "likes" || list_view === "clips") {
            list_view   = "account." + list_view;
            params      = {"userId" : AccountService.getAccountId()};
        }
        if (list_view.indexOf("collection_clips") === 0) {
            list_view   = "collection";
            params      = {"colId" : $scope.clip.collection_id};
        }
//p(counter);
//p(state);
        $ionicViewSwitcher.nextDirection('back');
        if (counter) { // && list_view.indexOf("account.") === -1
            $ionicHistory.goBack(counter);
        }
        else {
            $state.go(list_view, params);
        }*/

        $rootScope.back();

        if ($scope.orientation_changed) {
            $timeout(function() {
                $rootScope.$broadcast("orientation:change");
            });
            $scope.orientation_changed = false;
        }
    };

    $scope.shareClip = function() {
        if (!$rootScope.is_app) {
            return false;
        }
        var link = ConfigService.server_url() + "/clip/" + $scope.clip.nid;
        var desc = "Hi! Take a look at this clip on Bazaarr: " + $scope.clip.desc_text + "\n\r\n";
        //ImageService.convertImgToBase64URL($scope.clip.img_large).then(function(data) {
            $cordovaSocialSharing.share(desc, "This clip on Bazaarr may be interesting for you!", null, link)
            .then(function(result) {
                ToastService.showMessage("success", "Successfully sent!");
            }, function(err) {
                ToastService.showMessage("danger", "Error occured");
            });
        //}, function() {
        //    ToastService.showMessage("danger", "Error occured");
        //});
    };

    $scope.toggleDescription = function(isAreaClick) {

        if ($scope.clip.source_url && isAreaClick && !document.body.classList.contains('desc-open')) {
            $scope.openFeed($scope.clip.nid)
        }

        if($scope.clip.desc_text.length > 50) {
            if(document.body.classList.contains('desc-open') && isAreaClick) {
                var obj = new CutString($scope.clip.desc, 50);
                $scope.clip.full_short_desc = obj.cut();
                document.body.classList.remove('desc-open');
                if($scope.clip.full_short_desc.length - $scope.clip.full_short_desc.lastIndexOf('...') == 3) {
                    $scope.clip.full_short_desc = $scope.clip.full_short_desc.substr(0, $scope.clip.full_short_desc.lastIndexOf ('...')) + '<span class="expand">...</span>'
                }
            } else if(!isAreaClick) {
                $scope.clip.full_short_desc = $scope.clip.desc;
                document.body.classList.add('desc-open');
            }
        }
        /*if ($scope.clip.source_url && $scope.clip.price > 0) {
            $rootScope.openInApp($scope.clip.source_url, false, $scope.clip.is_video)
        }
        if ($scope.clip.source_url && !$scope.clip.price) {
            $scope.openFeed($scope.clip.nid)
        }*/
    };

    $ionicPopover.fromTemplateUrl('views/menu/clip_popover.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.clipPopover = popover;
    });

    $scope.openPopover = function($event) {
        $scope.clipPopover.show($event);
    };

    $scope.onHold = function(clip) {
        ClipService.clip    = clip;
        $scope.clip         = ClipService.clip;
        $scope.clip_owner   = ClipService.clip.uid == UserService.user.uid;

        $scope.clip_actions_popup = $ionicPopup.show({
            title: 'Clip actions',
            cssClass: 'popup-actions',
            templateUrl: 'views/popups/clip_actions.html',
            buttons: [
                {
                    text: 'Cancel'
                }
            ],
            scope: $scope
        });
    };
    
    $scope.openFeed = function(nid) {
        StateService.goFeed(nid);
    }

    $scope.$on('orientation:change', function(event) {
        $scope.orientation_changed = true;
    });
});

angular.module('bazaarr').controller('CommentCtrl',
function($scope, $state, $ionicPopup, $ionicLoading, 
CommentService, UserService, ClipService, ToastService, ClipsService, comments, reclip_users, like_users) {
    $scope.comments                 = comments.data;
    $scope.reclip_users             = reclip_users.data;
    $scope.like_users               = like_users.data;
    $scope.new_comment              = {};
    $scope.new_comment.body_value   = "";

    $scope.addComment = function() {
        $ionicLoading.show();
        $scope.new_comment.nid = $state.params.clipId;

        CommentService.add($scope.new_comment).then(function(data){
            $scope.new_comment.picture          = {};
            $scope.new_comment.picture.small    = UserService.user.picture;
            $scope.new_comment.name             = UserService.user.name;
            $scope.new_comment.uid              = UserService.user.uid;
            $scope.new_comment.cid              = data.data.cid;
            $scope.comments.push($scope.new_comment);
            $scope.new_comment = {};
            
            ClipService.clip.comment_count++;
            $ionicLoading.hide();
        }, function(reason) {
            ToastService.showMessage("danger", reason.data);
            $ionicLoading.hide();
        });
    };

    $scope.goLogin = function() {
        UserService.post_login.redirect     = "comments";
        UserService.post_login.params       = {clipId : $state.params.clipId};

        $state.go('login');
    };

    $scope.openActionsPopup = function(comment) {
        if (comment.uid !== UserService.user.uid) {
            return false;
        }

        comment.index           = this.$parent.$index;
        CommentService.comment  = comment;

        $scope.comment_actions_popup = $ionicPopup.show({
            title: 'Comment actions',
            cssClass: 'popup-actions',
            templateUrl: 'views/popups/comment-actions.html',
            buttons: [
                {
                    text: 'Cancel',
                    onTap: function(e) {
                        $scope.closeActionsPopup();
                    }
                }
            ],
            scope: $scope
        });
    };

    $scope.openEditPopup = function() {
        $scope.comment = CommentService.comment;
        $scope.comment_edit_popup = $ionicPopup.show({
            title: 'Edit comment',
            templateUrl: 'views/popups/inputs/comment-edit.html',
            buttons: [
                {
                    text: 'Cancel'
                },
                {
                    text: 'Save',
                    onTap: function(e) {
                        CommentService.save().then(function(data){
                            $scope.comments[CommentService.comment.index].body_value = $scope.comment.body_value;
                        }, function(reason) {
                            ToastService.showMessage("danger", reason.data);
                        });
                    }
                }
            ],
            scope: $scope
        });

        $scope.closeActionsPopup();
    };

    $scope.deleteComment = function() {
        var confirmPopup = $ionicPopup.confirm({
            title: 'Delete comment',
            template: '<div class="delete-text">Are you sure you want to delete this comment?</div>'
        });
        confirmPopup.then(function(res) {
            if (res) {
                CommentService.delete().then(function(data){
                    ClipService.clip.comment_count--;
                    $scope.comments.splice(CommentService.comment.index, 1);
                    ToastService.showMessage("success", "Comment successfully deleted!");
                },
                function(reason) {
                    ToastService.showMessage("danger", reason.data);
                });
            }
        });

        $scope.closeActionsPopup();
    };

    $scope.closeActionsPopup = function() {
        $scope.comment_actions_popup.close();
    };

    $scope.textareaLimit = function(textarea, rows, chars) {
        var newValue;
        if($scope.new_comment.body_value){
            var valueSegments = $scope.new_comment.body_value.split('\n');
            if(rows != undefined && valueSegments.length > rows) { // too many rows
                newValue = valueSegments.slice(0, rows).join("\n");
            }
            if(chars != undefined && $scope.new_comment.body_value.length > chars) { // too many chars
                if(newValue != undefined)
                    newValue = newValue.substring(0, chars);
                else
                    newValue = $scope.new_comment.body_value.substring(0, chars);
            }
            if(newValue != undefined) $scope.new_comment.body_value = newValue;
        }
    }
});

angular.module('bazaarr').controller('FeedCtrl', function($scope, ClipService, feed_html) {
    $scope.feed_html = feed_html.data;
    $scope.clip      = ClipService.clip;

    $scope.$on("clip:load", function() {
        $scope.clip = ClipService.clip;
    });
});

angular.module('bazaarr').service('FeedService', function($rootScope, HttpService, ClipService) {
    this.load = function(nid) {
        HttpService.view_url    = "source-feed/" + nid;
        var promise = HttpService.get();
        /*promise.then(function(data) {
        }, function(reason) {
            
            $rootScope.openInApp(ClipService.clip.source_url, false, ClipService.clip.is_video);
        });*/
        if (angular.isUndefined(ClipService.clip.nid) || ClipService.clip.nid != nid) {
            ClipService.load(nid).then(function() {
                $rootScope.$broadcast("clip:load");
            });
        }
        
        return promise;
    };
});

angular.module('bazaarr').service('CommentService', function($q, HttpService) {
    this.comment = {};

    this.load = function(clip_id) {
        HttpService.view_url    = "comments";
        HttpService.params      = {"nid" : clip_id};
        return HttpService.get();
    };

    this.add = function(comment) {
        if (!comment.body_value) {
            return $q.reject({"data" : "Comment field is required!"});
        }

        HttpService.view_url    = "comment";
        HttpService.params      = comment;
        return HttpService.post();
    };

    this.save = function() {
        HttpService.view_url    = "comment/" + this.comment.cid;
        HttpService.params      = {"data" : this.comment};
        return HttpService.put();
    };

    this.delete = function() {
        HttpService.view_url    = "comment/" + this.comment.cid;
        return HttpService.delete();
    };
});

angular.module('bazaarr').controller('SingleClipCtrl',
function($scope, $state, $timeout, $ionicScrollDelegate, ClipService, ClipsService, UserService, ArrayService, SliderService) {

});

angular.module('bazaarr').service('ClipService', function($q, $ionicLoading, $state, HttpService, ClipsService, SearchService) {
    this.clip = {};
    this.load_from_server = false;
    /*this.load = function(id) {
        HttpService.view_url    = "recent";
        HttpService.params      = {"nid" : id};
        HttpService.is_auth     = false;
        return HttpService.get();
    };*/

    this.load = function(id) {
        $state.params.clipId = id;
        var clip = this.getClip();
        
        if (clip.nid && !this.load_from_server) {
            this.clip    = clip;
            return $q.when({"data": [clip]});
        }
        this.load_from_server = false;
        
        HttpService.view_url    = "recent";
        HttpService.params      = {"nid" : id};
        HttpService.is_auth     = false;
        var promise = HttpService.get();
        var that    = this;

        promise.then(function(data){
            that.clip = ClipsService.preRenderSingle(data.data[0]);
        });

        return promise;
    };

    this.nodeLoad = function(nid) {
        HttpService.view_url = "recent";
        HttpService.params = {nid: nid};

        return HttpService.get();
    };

    this.likeClip = function(clip) {
        //$ionicLoading.show();
        HttpService.addNoCache("likes");

        HttpService.view_url = "vote/" + clip.nid;
        var promise = HttpService.put();

        promise.then(function() {
            $ionicLoading.hide();
        });

        return promise;
    };

    this.formatReclip = function(clip, bid) {
        return {
            ph_bid: bid,
            desc: clip.desc,
            nid: clip.nid
        };
    };

    this.blockClip = function (){
        HttpService.view_url = "block";
        HttpService.params = {
            nid: this.clip.nid,
            block: typeof this.clip.bloked === 'undefined' ? 1 : this.clip.bloked
        };

        return HttpService.post();
    };

    this.loadMore = function() {
        $ionicLoading.show();
        var that = this;
        var promise = {};//ClipsService.loadMore();

        if (this.page_list === "search") {
            promise = SearchService.loadMore();
        }
        else {
            promise = ClipsService.loadMore();
        }

        promise.then(function(data) {
            ClipsService.prepare(data.data);
            if (angular.isDefined(data.data[0])) {
                that.preloadImage(data.data[0].img_large);
            }
            $ionicLoading.hide();
        });

        return promise;
    };

    this.getClip = function(index) {
        index           = index || 0;
        var preload_index   = index >= 0 ? 1 : -1;
        var clip = {};
        var page_list = this.page_list || ClipsService.page_api_url;//this.clip.page_list || ClipsService.page_api_url;
        var clips = ClipsService.clips[page_list];
        var that = this;

        angular.forEach(clips, function(value, key) {
            if (value.nid === $state.params.clipId && angular.isDefined(clips[key + index])) {
                clip = clips[key + index];

                if (angular.isDefined(clips[key + index + preload_index])) {
                    that.preloadImage(clips[key + index + preload_index].img_large);
                }

                if (clips.length > 2 && key > clips.length - 2) {
                    that.loadMore();
                }
            }
        });
        
        return clip;
    };

    this.preloadImage = function(src) {
        var i = new Image();
        i.src = src;
        i.onload = function(){

        };
    };
});

angular.module('bazaarr').service('SliderService', function($q, $state, $ionicLoading, ClipsService, ClipService) {
    this.clips = [];
    /*
    this.load = function() {
        if (angular.isDefined(ClipsService.clips[ClipsService.page_api_url])) {
            return $q.when({"data" : ClipsService.clips[ClipsService.page_api_url]});
        }

        return $q.when({"data" : ""});

        //TODO: loading after refresh a page in web version
        var promise = ClipsService.load();

        promise.then(function(data) {
            ClipsService.prepare(data.data);
        });

        return promise;
    };

    this.loadMore = function() {
        $ionicLoading.show();
        var promise = ClipsService.loadMore();

        promise.then(function(data) {
            ClipsService.prepare(data.data);
            $ionicLoading.hide();
        });

        return promise;
    };

    this.buildNew = function(clips) {
        this.clips = [];
        return this.build(clips);
    };

    this.build = function(clips) {
        clips = clips || ClipsService.clips[ClipsService.page_api_url];

        var slider = {};
        var i = 0;
        var that = this;

        slider.clips    = this.clips;
        //slider.clip_ids = [];
        slider.index    = -1;
        slider.counter  = clips.length;
        angular.forEach(clips, function(value, key) {
            if (value.nid === $state.params.clipId) {
                if (!slider.clips.length) {
                    slider.index = 2;
                    if (angular.isDefined(clips[key - 2])) {
                        slider.clips.push(clips[key - 2]);
                    }
                    else {
                        slider.index = 1;
                    }
                    if (angular.isDefined(clips[key - 1])) {
                        slider.clips.push(clips[key - 1]);
                    }
                    else {
                        slider.index = 0;
                    }
                    slider.clips.push(value);
                    //slider.clip_ids.push(value.nid);
                    if (angular.isDefined(clips[key + 1])) {
                        slider.clips.push(clips[key + 1]);
                    }
                    if (angular.isDefined(clips[key + 2])) {
                        slider.clips.push(clips[key + 2]);
                    }
                }
                else {
                    if (angular.isDefined(clips[key + 2])) {
                        slider.clips.push(clips[key + 2]);
                    }
                }

                if (key > clips.length - 3) {
                    that.loadMore();
                }
            }
            i++;
        });

        this.clips = slider.clips;

        return slider;
    };

    this.getClip = function(index) {
        index           = index || 0;
        var preload_index   = index >= 0 ? 1 : -1;
        var clip = {};
        var page_list = ClipService.clip.page_list || ClipsService.page_api_url;
        var clips = ClipsService.clips[page_list];
        var that = this;

        angular.forEach(clips, function(value, key) {
            if (value.nid === $state.params.clipId && angular.isDefined(clips[key + index])) {
                clip = clips[key + index];

                if (angular.isDefined(clips[key + index + preload_index])) {
                    that.preloadImage(clips[key + index + preload_index].img_large);
                }

                if (key > clips.length - 2) {
                    that.loadMore();
                }
            }
        });

        return clip;
    };

    this.preloadImage = function(src) {
        var i = new Image();
        i.src = src;
        i.onload = function(){

        };
    };*/
});
;'use strict';
angular.module('bazaarr').controller('ClipsCtrl',
function($scope, $rootScope, $state, $timeout, $cacheFactory, $ionicPopup, $ionicScrollDelegate, $ionicPosition, $ionicNavBarDelegate, $ionicLoading, $ionicHistory, 
MenuService, ClipsService, SearchService, ClipService, UserService, CollectionService, ToastService, HttpService, FollowService, AccountService,
clips) {
    /*$scope.$watch("clips", function(newValue, oldValue){
        p(newValue);
        p(oldValue);
    });*/

    var menu = MenuService.getActiveMenu();
    
    if (angular.isDefined(clips.data) && clips.data != null && clips.data.length) {
        $scope.clips = ClipsService.prepare(clips.data, "", true);

        if (clips.data.length >= 10) {
            $timeout(function(){
                $scope.is_load_more = true;
            }, 1000);
        }
    }
    else {
        if (SearchService.isSearch()) {
            ToastService.showMessage("danger", "We did not find results. Please type a new query");
        }
        else {
            ToastService.showMessage("danger", "No clips");
        }
    }

    $scope.subtitle = "";
    $scope.title    = Object.keys(menu).length ? menu.name : SearchService.getTitle();
    $scope.loading_more = false;

    //$scope.cols     = ClipsService.getColsNumber();

    if ($state.includes("collection")) {
        setCollection();
    }
    if ($state.includes("hashtag")) {
        $scope.title    = '#' + $state.params.hashtagName;
    }
    if ($state.includes("category") && angular.isDefined(clips.data) && angular.isDefined(clips.data[0])) {
        $scope.title    = clips.data[0].category_name;
    }

    $scope.swipeLeft = function() {
        MenuService.nextMenu();
    };

    $scope.swipeRight = function() {
        MenuService.prevMenu();
    };

    $scope.openClip = function(clip) {
        //TODO: promise preloader
        ClipService.page_list = ClipsService.page_api_url;
        ClipService.preloadImage(clip.img_large);
        //$timeout(function() {
        $state.go("clip", {clipId : clip.nid}).then(function() {
            //$ionicScrollDelegate.$getByHandle('clipSingle').scrollTop(true);
        });
        //}, 200);
    };
    
    $scope.loadMore = function() {
        //$ionicLoading.show();
        if ($scope.loading_more === true) {
            $scope.$broadcast('scroll.infiniteScrollComplete');
            return false;
        }
        $scope.loading_more = true;
        var service  = {};
        if ($state.includes("search-results")) {
            service = SearchService.loadMore();
        }
        else {
            service = ClipsService.loadMore();
        }
		
        service.then(function(data) {
            if (data.data == null) {
                $scope.is_load_more = false;
                $scope.$broadcast('scroll.infiniteScrollComplete');
                $scope.loading_more = false;
                return false;
            }

            clips.data = clips.data.concat(data.data);
            $scope.clips = ClipsService.prepare(data.data);
			
            $timeout(function(){
                $scope.$broadcast('scroll.infiniteScrollComplete');
                $scope.loading_more = false;
            }, 500);
			
            if (data.data.length < 10) {
                $scope.is_load_more = false;
            }
            //$ionicLoading.hide();
        }, function(reason) {
            $scope.$broadcast('scroll.infiniteScrollComplete');
            $scope.loading_more = false;
            //$ionicLoading.hide();
        });
    };

    // provide actions on clip
    $scope.onHold = function(clip) {
        ClipService.clip    = clip;
        $scope.clip         = ClipService.clip;
        $scope.clip_owner   = ClipService.clip.uid == UserService.user.uid;

        $scope.clip_actions_popup = $ionicPopup.show({
            title: 'Clip actions',
            cssClass: 'popup-actions',
            templateUrl: 'views/popups/clip_actions.html',
            buttons: [
                {
                    text: 'Cancel'
                }
            ],
            scope: $scope
        });
    };

    $scope.getBlockedClass = function(block) {
        return block === 0 ? 'blocked' : '';
    };

    $scope.isSearch = function() {
        return SearchService.isSearch();
    };

    /*$scope.onScroll = function() {
        return true;

        if (clips.data.length < 100) {
            return false;
        }
        var pos = $ionicScrollDelegate.$getByHandle('clipList').getScrollPosition();
        var pos_top = pos.top - 300;
        var pos_bot = pos.top + window.innerHeight + 300;
        var all_clips = $scope.clips;
        angular.forEach(all_clips, function(clips_row, i){
            var height = 0;
            angular.forEach(clips_row, function(clip, j){
                var clip_el = document.getElementById("clip-" + clip.nid);
                height += clip_el.offsetHeight;//$ionicPosition.position();
                if (height > pos_top && height < pos_bot && all_clips[i][j].list_img === "") {
                    //p("Return: " + all_clips[i][j].img);
                    all_clips[i][j].list_img = all_clips[i][j].img;
                }
                else if ((height < pos_top || height > pos_bot) && all_clips[i][j].list_img !== "") {
                    //p("Remove: " + all_clips[i][j].img);
                    all_clips[i][j].list_img = '';
                }
            });
        });
        $scope.$apply(function(){
            $scope.clips = all_clips;
        });
    };*/

    $scope.doRefresh = function() {
        if ($state.includes("search-results")) {
            $scope.$broadcast('scroll.refreshComplete');
            return false;
        }

        if ($state.current.name.indexOf("account.") > -1) {
            AccountService.update();
        }

        //TODO: remove after prepend new clips functionality
        var $httpDefaultCache = $cacheFactory.get('$http');
        $httpDefaultCache.removeAll();
        //HttpService.addNoCache(ClipsService.page_api_url.replace(/\-\d+/gi, ""));
        ClipsService.pager[ClipsService.page_api_url] = 0;
        ClipsService.load(ClipsService.page_api_url, ClipsService.is_user_page, ClipsService.params).then(function(data) {
            $scope.clips = ClipsService.prepare(data.data, "", true);

            $rootScope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.$parent.doRefresh = $scope.doRefresh;

    $scope.canEdit = function() {
        if ($rootScope.isMyAccount() && $state.includes("account.collections")) {
            return true;
        }

        return false;
    }

    $scope.$on('orientation:change', function() {
        if (ClipsService.getColsNumber() === ClipsService.size) {
            return false;
        }
        if ($scope.$$phase) {
            $scope.clips = ClipsService.prepare(clips.data); //applyOrientation
        }
        else {
            $scope.$apply(function () {
                $scope.clips = ClipsService.prepare(clips.data); //applyOrientation
            });
        }
        $ionicHistory.clearCache();
    });

    $scope.accept_collection = function(coll, type) {
        var bid = coll.bid;

        CollectionService.accept_collection(bid, type).then(function(data){
            if(type == 0 || type == 3){
                $state.go('account.collections', {"userId" : $rootScope.user.uid});
            } else {
                $scope.collection.accepted = '1';
            }
            HttpService.clearCache();

            ToastService.showMessage("success", data.data.messages.status[0]);
        });
    };
    
    $scope.addClipFromCollection = function(collection) {
        CollectionService.add_clip_collection = collection;
        $state.go("add");
    }

    $scope.goEditCollection = function(bid) {
        $state.go("edit-collection", {collectionId : bid});
    };

    $scope.backCondition = function() {
        if($state.includes('collection') || $state.includes('hashtag')) {
            $rootScope.back();
        }
    };
    
    function setCollection() {
        CollectionService.singleLoad($state.params.colId).then(function(data) {
            $scope.collection   = data.data[0];

            $scope.title = data.data[0].name;
            $timeout(function(){
                //$scope.title = data.data[0].name;
                $ionicNavBarDelegate.title(data.data[0].name);
            }, 800);
        });
    }
});

angular.module('bazaarr').service('ClipsService',
function($state, $timeout, $ionicLoading, HttpService, AccountService, ArrayService, UserService) {
    this.pager = {};

    this.page_api_url   = "recent";
    this.is_user_page   = false;
    this.params         = {};

    this.clips = {};
    //this.clips.length = 0;

    this.newArr     = [];
    this.newArrSize = [];
    this.size       = 0;

    this.loadMore = function() {
        this.is_more = true;
        this.pager[this.page_api_url] = typeof this.pager[this.page_api_url] === "undefined" ? 1 : this.pager[this.page_api_url] + 1;
        return this.loadAdapter();
    };

    this.load = function(page, is_user_page, params) {
        this.params = params || {};
        this.is_more = false;
        //TODO: why nested views not cache controller
        if (page === "clips" || page === "likes") {
            this.pager[page] = 0;
        }
        return this.loadAdapter(page, is_user_page, params);
    };

    this.loadAdapter = function(page, is_user_page, params) {
        this.page_api_url   = page            || this.page_api_url;
        this.is_user_page   = is_user_page    || this.is_user_page;

        //Add id of collection to separate clips from different collections
        if (angular.isDefined(params) && angular.isDefined(params.bid)) {
            this.page_api_url = this.page_api_url + "-" + params.bid;
        }
        if (angular.isDefined(params) && angular.isDefined(params.tid_raw)) {
            this.page_api_url = this.page_api_url + "-" + params.tid_raw;
        }

        HttpService.view_url = this.page_api_url.replace(/\-\d+/gi, "");
        HttpService.page     = this.pager[this.page_api_url] || 0;
        HttpService.is_auth  = false;//this.is_user_page ? true : false;
        HttpService.params   = params || this.params;

        if (this.is_user_page) {
            HttpService.params.uid = AccountService.getAccountId();
        }

        return HttpService.get();
        /*if (!HttpService.page) {
            $ionicLoading.show();
        }

        var ret = HttpService.get();
        ret.then(function(data) {
            $ionicLoading.hide();
        })

        return ret;*/
    }

    this.chunk_wall = function(arr, size) {
        if (!!arr === false) {
            return false;
        }

        if ((this.size && this.size !== size) || !this.is_more)  {
            this.newArr[this.page_api_url]      = [];
            this.newArrSize[this.page_api_url]  = [];
        }
        this.size = size;

        var newArr      = [];
        var newArrSize  = [];
        var j           = 0;
        var j_value     = 0;

        if (angular.isUndefined(this.newArr[this.page_api_url]) || !this.newArr[this.page_api_url].length) {
            this.newArr[this.page_api_url]      = [];
            this.newArrSize[this.page_api_url]  = [];
            for (var i = 0; i < size; i++) {
                this.newArr[this.page_api_url][i]       = [];
                this.newArrSize[this.page_api_url][i]   = 0;
            }
        }

        for (var i = 0; i < arr.length; i++) {
            j_value = this.newArrSize[this.page_api_url].reduce(function (p, v) {
                return ( p < v ? p : v);
            });
            j = this.newArrSize[this.page_api_url].indexOf(j_value);

            this.newArr[this.page_api_url][j].push(arr[i]);

            if (typeof arr[i].img_h !== "undefined") {
                this.newArrSize[this.page_api_url][j] += arr[i].img_h;
            }
            if (typeof arr[i].desc !== "undefined") {
                this.newArrSize[this.page_api_url][j] += Math.ceil(10 / size) * 15;
            }
        }

        return this.newArr[this.page_api_url];
    },

    this.chunk_collection = function(arr, size) {
        if (!!arr === false) {
            return false;
        }

        var newArr      = [];
        var newArrSize  = [];
        var j           = 0;
        var j_value     = 0;

        for (var i = 0; i < size; i++) {
            newArr[i]       = [];
            newArrSize[i]   = 0;
        }

        for (var i = 0; i < arr.length; i++) {
            j_value = newArrSize.reduce(function (p, v) {
                return ( p < v ? p : v);
            });
            j = newArrSize.indexOf(j_value);

            newArr[j].push(arr[i]);

            if (typeof arr[i].img_h !== "undefined") {
                newArrSize[j] += arr[i].img_h;
            }
            if (typeof arr[i].desc !== "undefined") {
                newArrSize[j] += Math.ceil(arr[i].desc.length / (7 * size)) * 15;
            }
        }

        return newArr;
    },

    this.chunk_table = function(arr, size) {
        if(arr) {
            var chunks = [],
                i = 0,
                n = arr.length;

            while (i < n) {
                chunks.push(arr.slice(i, i += size));
            }

            return chunks;
        }
    },

    this.applyOrientation = function(data, type) {
        type = type || "wall";

        var cols = this.getColsNumber();

        if ("table" == type) {
            return this.chunk_table(data, cols);
        }

        switch (type) {
            case "table":
                return this.chunk_table(data, cols);
                break;
            case "collection":
                return this.chunk_collection(data, cols);
                break;
            default:
                return this.chunk_wall(data, cols);
                break;
        }
    };

    this.getColsNumber = function() {
        var cols = 2;

        if (window.matchMedia("(orientation: landscape)").matches) {
           cols = 3;
        }

        if (ionic.Platform.isIPad()) {
            cols++;
        }

        return cols;
    };

    this.getCollection = function(bid) {
        HttpService.view_url = "collection_clips";
        HttpService.params   = {"bid" : bid};

        return HttpService.get();
    };

    CutString.prototype.cut = function(){
        var newDiv = document.createElement('div');
        this.searchEnd(this.tempDiv, newDiv);
        return newDiv.innerHTML;
    };

    CutString.prototype.searchEnd = function(parseDiv, newParent){
        var ele;
        var newEle;
        for(var j=0; j< parseDiv.childNodes.length; j++){
        ele = parseDiv.childNodes[j];
        // not text node
        if(ele.nodeType != 3){
            newEle = ele.cloneNode(true);
            newParent.appendChild(newEle);
            if(ele.childNodes.length === 0)
            continue;
            newEle.innerHTML = '';
            var res = this.searchEnd(ele,newEle);
            if(res)
            return res;
            else{
            continue;
            }
        }

        // the limit of the char count reached
        if(ele.nodeValue.length + this.charCount >= this.limit){
            newEle = ele.cloneNode(true);
            newEle.nodeValue = ele.nodeValue.substr(0, this.limit - this.charCount) + '...';
            newParent.appendChild(newEle);
            return true;
        }
        newEle = ele.cloneNode(true);
        newParent.appendChild(newEle);
        this.charCount += ele.nodeValue.length;
        }
        return false;
    };

    function cutHtmlString($string, $limit){
        var output = new CutString($string,$limit);
        return output.cut();
    }

    this.prepare = function(data, page, clear) {
        page = page || this.page_api_url;
        clear = clear || false;
//p(page);
        var width = Math.round(window.innerWidth * 0.9 / this.getColsNumber());

        if (angular.isUndefined(this.clips[page]) || clear) {
            this.clips[page] = [];
        }

        for (var i = 0; i < data.length; i++) {
            data[i] = this.preRenderSingle(data[i], width, page);
            var clips_length = this.clips[page].push(data[i]);
            data[i].index = clips_length - 1;
        }
/*var str = "";
angular.forEach(this.clips[page], function(value) {
    str += " - " + value.nid;
});
p(str);*/
        return this.applyOrientation(data);
    };

    this.hashtagUrlWrap = function (str) {
        if (angular.isUndefined(str)) {
            return "";
        }
        var count = (str.match(/href/g) || []).length;
        if (count) {
            return str;
        }
        return str.replace(/#(\S*)/g, '<a href="#/hashtag/$1">#$1</a>');
    };

    this.fakeHashtagUrlWrap = function (str) {
        var count = (str.match(/href/g) || []).length;
        if (count) {
            return str;
        }
        return str.replace(/#(\S*)/g, '<span class="tag">#$1</span>');
    };

    this.preRenderSingle = function(data, width, page) {
        page = page || this.page_api_url;
        data.source_domain = ArrayService.url_domain(data.source_url);

        if(data.desc) {
            var hashtags = data.desc.match(/#\S*/g);
            data.random_hashtag = hashtags ? hashtags[Math.floor(Math.random()*hashtags.length)].substr(1) : "";
        }
        
        data.desc_text = data.desc;
        data.desc = this.hashtagUrlWrap(data.desc);
        //var obj = new CutString(data.desc, 70);
        if(data.desc_text && data.desc_text.length > 50) {
            var obj = new CutString(this.fakeHashtagUrlWrap(data.desc_text), 50);
        } else {
            var obj = new CutString(data.desc, 50);
        }
        data.full_short_desc = obj.cut();
        if(data.full_short_desc.length - data.full_short_desc.lastIndexOf('...') == 3) {
            data.full_short_desc = data.full_short_desc.substr(0, data.full_short_desc.lastIndexOf ('...')) + '<span class="expand">...</span>'
        }

        data.wrap_h          = Math.round(width * data.img_h / data.img_w);
        data.img_large_h     = Math.round(window.innerWidth * 0.9 * data.img_h / data.img_w);
        data.list_img        = data.img;
        data.comment_count   = parseInt(data.comment_count);
        data.price           = parseFloat(data.price);
        data.page_list       = page;
        data.index           = 0;

        var c = document.getElementsByClassName('view-container')[0];
        if(c.clientWidth / c.clientHeight > 0.67) {
            data.tablet = 1;
        } else {
            data.tablet = 0;
        }

        return data;
    };

    this.getScreenWidth = function() {
        if (window.matchMedia("(orientation: landscape)").matches) {
           return screen.height;
        }

        return screen.width;
    };

    this.updateClipInList = function(clip) {
        this.clips[clip.page_list][clip.index] = clip;
    };
});

angular.module('bazaarr').filter('inSlicesOf', ['ClipsService', function(ClipsService) {
    this.makeSlices = function(items, count) {
        count = count || 2;

        if (!angular.isArray(items))
            return items;

        var array       = [];
        var chunkIndex  = -1;
        for (var i = 0; i < items.length; i++) {
            //var chunkIndex = parseInt(i / count, 10);
            chunkIndex = chunkIndex === count - 1 ? 0 : chunkIndex + 1;

            if (angular.isUndefined(array[chunkIndex])) {
                array[chunkIndex] = [];
            }

            array[chunkIndex].push(items[i]);
        }

        if (!angular.equals(ClipsService.arrayinSliceOf, array)) {
            ClipsService.arrayinSliceOf = array;
        }

        return ClipsService.arrayinSliceOf;
    };

    return this.makeSlices;
}])
;'use strict';
angular.module('bazaarr').controller('AccountCollectionListCtrl',
function($scope, $rootScope, $state, $ionicHistory, CollectionService, FollowService, AccountService, ClipsService, HttpService, collections, ToastService) {
    $scope.col_width = Math.round(100 / ClipsService.getColsNumber());
    $scope.grouped_list = {};

    FollowService.colls = $scope.grouped_list;

    for(var type in collections.data){
        $scope.grouped_list[type] = setCollections(collections.data[type], type);
    }

    $scope.goAddCollection = function() {
        $scope.collection = {bid:"new"};
        $state.go("add-collection").then(function(){
            $rootScope.$broadcast("form:clear");
        });
    };

    function setCollections(collections, type) {
        if ($state.includes('account.collections') && AccountService.is_my_account && collections && collections[0].bid != 0 && type == 'public') {
            collections.unshift({"bid" : 0});
        }
        return CollectionService.prepare(collections);
    }

    $scope.isFirst = function(bid) {
        return !!bid === false ? true : false;
    };

    $scope.openCollection = function(id) {
        $state.go("collection", {colId : id}).then(function(){
            $rootScope.$broadcast('update:collection_titles', {bid : id});
        });
    };

    $scope.accept_collection = function(coll, type) {
        var index           = this.$parent.$parent.$parent.$index,
            parent_index    = this.$parent.$parent.$parent.$parent.$index,
            bid             = coll.bid;

        CollectionService.accept_collection(bid, type).then(function(data){
            HttpService.addNoCache("get_user_collections/" + $rootScope.user.uid);
            if(type == 0 || type == 3){

                $scope.grouped_list[coll.type][parent_index].splice(index, 1);
                if(!$scope.grouped_list[coll.type][parent_index].length){
                    $scope.grouped_list[coll.type].splice(parent_index, 1);
                }
                if(angular.isDefined($scope.grouped_list['shared']) && (!$scope.grouped_list['shared'] || $scope.grouped_list['shared'].length == 0)){
                    delete $scope.grouped_list['shared'];
                }
            } else {
                $scope.grouped_list[coll.type][parent_index][index].accepted = 1;
            }

            ToastService.showMessage("success", data.data.message);
        });
    };

    $scope.goEditCollection = function(bid) {
        $state.go("edit-collection", {collectionId : bid});
    };

    $scope.followCollection = function(coll, type) {
        var send_type       = (1 === type) ? 0 : 1,
            bid = coll.bid,
            parent_index    = this.$parent.$parent.$parent.$parent.$index,
            index           = this.$parent.$parent.$parent.$index,
            is_follow       = $scope.account.is_follow;

        FollowService.followCollection(bid, send_type).then(function(data){
            if(send_type){
                $scope.account.is_follow = 1;
            }
            if(!data.data.user_follow){
                $scope.account.is_follow = 0;
            }
            if(data.data.message){
                ToastService.showMessage("success", data.data.message);
            }
            $scope.grouped_list[coll.type][parent_index][index].follow = send_type;
            FollowService.followUserCallback(send_type);
            if (is_follow !== $scope.account.is_follow) {
                AccountService.updateCounters('followers_count', send_type, true);
            }
        });
    };

    $scope.$parent.doRefresh = function() {
        //$rootScope.$broadcast('scroll.refreshComplete');
        //return true;

        var promise = {};
        HttpService.addNoCache("get_user_collections/" + AccountService.getAccountId());
        promise = CollectionService.load2();

        AccountService.update();

        promise.then(function(data) {
            for(var type in data.data){
                $scope.grouped_list[type] = setCollections(data.data[type], type);
            }

            $rootScope.$broadcast('scroll.refreshComplete');
        });
    };

    $scope.$on('collections:follow', function(event, args) {
        for(var type in collections.data){
            collections.data[type] = CollectionService.revertFollow(collections.data[type], args.type);

            $scope.grouped_list[type] = setCollections(collections.data[type], type);
            //$scope.types[type] = 1;
        }
    });

    $scope.$on('orientation:change', function(event) {
        $scope.$apply(function () {
            $scope.col_width = Math.round(100 / ClipsService.getColsNumber());

            for(var type in collections.data){
                $scope.grouped_list[type] = setCollections(collections.data[type], type);
                //$scope.types[type] = 1;
            }
        });
        $ionicHistory.clearCache();
    });
});

angular.module('bazaarr').controller('CollectionListCtrl',
function($scope, $rootScope, $state, $timeout, $ionicHistory, $ionicPosition, $ionicScrollDelegate, 
CollectionService, FollowService, AccountService, ToastService, HttpService, collections) {
    /*if (!UserService.is_login) {
        $state.go('login');
        return false;
    }*/

    setCollections(collections);
    
    setCover(0); 
    $timeout(function() {
        setPositions();
    });
    $scope.col_width = Math.round(100 / CollectionService.getColsNumber());

    $scope.openClip = function(id, display_id, page, collection_id) {
        $state.go("clip", {clipId : id, displayId : display_id, pageId : page, collectionId : collection_id});
    };

    $scope.openCollection = function(id) {
        $state.go("collection", {colId : id});
    };

    $scope.isFirst = function(bid) {
        return !!bid === false ? true : false;
    };

    $scope.goAddCollection = function() {
        $scope.collection = {};
        $state.go("add-collection");
    };

    $scope.goEditCollection = function(bid) {
        $state.go("edit-collection", {collectionId : bid});
    };

    $scope.followCollection = function(coll, type) {
        var send_type       = (1 === type) ? 0 : 1;
        //if ($state.includes("account.collections")) {
            var parent_index    = this.$parent.$parent.$parent.$parent.$index;
            var index           = this.$parent.$parent.$parent.$index;
            var bid = coll.bid
        /*}
        else {
            var parent_index    = this.$parent.$parent.$parent.$index;
            var index           = this.$parent.$parent.$parent.$parent.$index;
        }*/

        FollowService.followCollection(bid, send_type).then(function(data){
            $scope.collections[parent_index][index].follow = send_type;

            FollowService.followCollectionCallback(data.data.user_follow);
        });
    };

    $scope.canEdit = function() {
        if ($rootScope.isMyAccount() && $state.includes("account.collections")) {
            return true;
        }

        return false;
    }

    $scope.$parent.doRefresh = function() {
        var promise = {};
        if ($state.includes("account.following-collections")) {
            HttpService.addNoCache("collections-followed");
            promise = FollowService.loadCollections();
        }
        else if ($state.includes("account.collections")) {
            HttpService.addNoCache("get_user_collections/" + AccountService.getAccountId());
            promise = CollectionService.load2();
        }
        else {
            return false;
        }

        AccountService.update();

        promise.then(function(data) {
            setCollections(data);

            $rootScope.$broadcast('scroll.refreshComplete');
        });
    };
    
    $scope.changeCollection = function(index) {
        setCover(index);
    };
    
    $scope.getCover = function() {
        return {'background-image': 'url(' + $scope.cover_img + ')'};
    }
    
    var already_scroll = false;
    $scope.scrollCollections = function() {
        if (already_scroll) {
            return false;
        }
        already_scroll = true;
        
        $timeout(function() {
            setNearestCollection($ionicScrollDelegate.getScrollPosition().top);
        }, 1000);
    }
    
    $scope.accept_collection = function(coll, type) {
        var index           = this.$parent.$parent.$parent.$index,
            parent_index    = this.$parent.$parent.$parent.$parent.$index,
            bid             = coll.bid;

        CollectionService.accept_collection(bid, type).then(function(data){
            HttpService.addNoCache("get_user_collections/" + $rootScope.user.uid);
            if(type == 0 || type == 3){
                $scope.collections[parent_index].splice(index, 1);
                if(!$scope.collections[parent_index].length){
                    $scope.collections.splice(parent_index, 1);
                }
            } else {
                $scope.collections[parent_index][index].accepted = 1;
            }

            ToastService.showMessage("success", data.data.message);
        });
    };
    
    var collection_top_positions = [];
    function setPositions() {
        var collection_elements = document.querySelectorAll(".collection");
        angular.forEach(collection_elements, function(value, key) {
            collection_top_positions[key] = $ionicPosition.offset(angular.element(value)).top - 160;
        });
        collection_top_positions.push(100000);
    }
    
    function setNearestCollection(scroll_pos) {
//p(scroll_pos);
        var find_nearest = false;
        var scroll_to    = 0;
        var index        = 0;
//p(collection_top_positions);
        angular.forEach(collection_top_positions, function(value, key) {
            if (!find_nearest && scroll_pos < value) {
//p("Pos: " + collection_top_positions[key - 1] + " - " + scroll_pos + " - " + collection_top_positions[key]);
                scroll_to   = collection_top_positions[key];
                index       = key;
                if ((collection_top_positions[key] - scroll_pos) > (scroll_pos - collection_top_positions[key - 1])) {
                    scroll_to   = collection_top_positions[key - 1];
                    index       = key - 1;
                }
                scroll_to = 0 === index ? 0 : scroll_to;
//p(scroll_to + " - " + index);
                $ionicScrollDelegate.scrollTo(0, scroll_to, true);
                setCover(index);
                find_nearest = true;
                $timeout(function() {
                    already_scroll = false;
                }, 500);
            }
        });
    }

    function setCollections(collections) {
        if ($state.includes('account.collections') && AccountService.is_my_account
                && collections.data[collections.data.length - 1].bid != 0) {
            collections.data.push({"bid" : 0});
        }
        $scope.collections = CollectionService.prepare(collections.data);
    }
    
    function setCover(index) {
        $scope.cover_img = $scope.collections[index].cover_img;
    }

    $scope.$on('collections:follow', function(event, args) {
        collections.data = CollectionService.revertFollow(collections.data, args.type);
        setCollections(collections);
    });

    $scope.$on('orientation:change', function(event) {
        $scope.$apply(function () {
            $scope.col_width = Math.round(100 / CollectionService.getColsNumber());
            /*if ($state.includes('account.collections') && AccountService.is_my_account
                    && !Object.keys($scope.collections[0]).length) {
                CollectionService.collections.unshift({});
            }*/
            $scope.collections = CollectionService.prepare(collections.data);
        });
        $ionicHistory.clearCache();
    });
});

angular.module('bazaarr').controller('CollectionCtrl',
function($scope, $state, $ionicTabsDelegate, $ionicPopup, $timeout,
CollectionService, AccountService, CollSharedService, HttpService, UserService, ToastService, collection) {
    if($state.includes('edit-collection')){
        CollectionService.tmp_collection = angular.isUndefined(collection.data) ? {} : collection.data[0];
    } else {
        if(!CollectionService.tmp_collection){
            CollectionService.tmp_collection = {};
        }
    }
    
    CollectionService.getCategories(2).then(function(data){
        $scope.categories = data.data;
    });

    if(angular.isUndefined(CollectionService.tmp_collection) || angular.isUndefined(CollectionService.tmp_collection.bid)){
        CollectionService.tmp_collection = {
            bid: 'new'
        };
    }
    $scope.collection           = CollectionService.tmp_collection;

    $scope.shared               = {};
    $scope.shared.user_list     = {};
    $scope.search               = "";
    $scope.ionicTabsDelegate    = $ionicTabsDelegate.$getByHandle('shared-tabs');

    var sent = 0;
    var timeout_id = 0;
    $scope.checked_data = {};

    $scope.$on('form:clear', function(event, args) {
        CollectionService.tmp_collection = {
            bid: 'new'
        };
        $scope.collection = CollectionService.tmp_collection;
        $scope.checked_data = {};
    });

    if($state.includes('shared')){
        $scope.u_list = {};
        CollectionService.users[UserService.user.uid] = UserService.user.name;
        $scope.saveShared = function(data, bid){
            var tab = $scope.ionicTabsDelegate.selectedIndex(),
                params = {"bid" : bid, "type": "can_view"};
                params.uid = {};
            switch(tab){
                case 0:
                    params.uid[0] = 1;
                    $scope.checked_data = {};

                    break;
                case 1:
                    params.uid[UserService.user.uid] = 1;
                    $scope.checked_data = {};

                    break;
                case 2:
                    for(var i in data){
                        if(data[i]){
                            params.uid[i] = 1;
                        }
                    }
                    if(!Object.keys(params.uid).length){
                        ToastService.showMessage("danger", "Please select users");
                        return;
                    }

                    break;
            }

            CollectionService.tmp_collection.shared = params;
            // p(params);
            if(params.bid && /^-{0,1}\d*\.{0,1}\d+$/.test(params.bid)){
                $state.go('edit-collection', {"collectionId":  params.bid});
                return
            }

            $state.go('add-collection', {'action': 'account'});
        };

        $scope.searchUsers = function(text, fromButton){
            if(timeout_id){
                clearTimeout(timeout_id);
                timeout_id = 0;
            }
            if(text.length > 2 || fromButton && !sent){
                sent = 1;
                timeout_id = setTimeout(function(){
                    CollSharedService.searchText(text).then(function(data){
                        for(var j in $scope.checked_data){
                            if(!$scope.checked_data[j]){
                                delete $scope.checked_data[j];
                            }
                        }
                        var ln = data.data.length;
                        if(ln){
                            for(var i=0;i<ln;i++){
                                $scope.u_list[data.data[i].uid] = data.data[i].name;
                                CollSharedService.users[data.data[i].uid] = data.data[i].name;
                                if($scope.checked_data[data.data[i].uid]){
                                    continue;
                                }
                                $scope.checked_data[data.data[i].uid] = false;
                            }
                        }
                        $scope.shared.user_list = data.data;
                        sent = 0;
                    });
                }, 1000);
            }
        };

        if(angular.isUndefined(CollectionService.tmp_collection.shared) && $scope.collection.bid != 'new'){
            CollSharedService.loadData($scope.collection.bid).then(function(data){
                $scope.shared = data.data.shared_data;
                try{
                    var d = data.data.shared_data.can_view;
                    for(var i=0;i<d.length;i++){
                        $scope.u_list[d[i].uid] = d[i].name;
                        CollSharedService.users[d[i].uid] = d[i].name;
                    }
                } catch(e){
                    console.error(e);
                }
                if(typeof $scope.shared == 'undefined'){
                    return;
                }

                setTab($scope.shared.can_view);
            });
        } else {
            var shared = [];
            if(angular.isDefined(CollectionService.tmp_collection.shared)){
                // p(CollSharedService.users);
                for(var u in CollectionService.tmp_collection.shared.uid){
                    shared.push(
                        {
                            name: CollSharedService.users[u],
                            uid: u,
                        }
                    );
                }

                setTab(shared);
            }
        }
// p(CollSharedService.users);
    }

    function setTab(can_view){
        if(can_view.length){
            for(var i=0;i<can_view.length;i++){
                $scope.u_list[can_view[i].uid] = can_view[i].name;
                if(can_view[i].uid > 0) {
                    $scope.checked_data[can_view[i].uid] = true;
                }
            }
            var index = 0;

            if(can_view){
                if(can_view[0].uid == 0){
                    index = 0;
                    $scope.checked_data = {};
                } else if(i > 1){
                    index = 2;
                } else if(i == 1 && can_view[0].uid == UserService.user.uid){
                    index = 1;
                    $scope.checked_data = {};
                } else {
                    index = 2;
                }
            }

            $timeout(function(){
                $scope.ionicTabsDelegate.select(index);
            }, 200);
        }
    }

    $scope.checkWhoCanAdd = function(bid){
        if(angular.isUndefined(bid)){
            bid = "new";
        }
        CollSharedService.loadData(bid).then(function(data){
            $scope.shared = data.data.shared_data;

            if($scope.shared && $scope.shared.can_add.length){
                for(var i=0;i<$scope.shared.can_add.length;i++){
                    $scope.checked_data[$scope.shared.can_add[i].uid] = true;
                }
            }

            if($scope.shared && $scope.shared.followed.length > 0) {
                $scope.popup = $ionicPopup.show({
                    title: 'Who can add clips',
                    templateUrl: 'views/popups/inputs/collection-can-add.html',
                    scope: $scope,
                    buttons: [{
                        text: 'Cancel'
                    },{
                        text: 'Save',
                        onTap: function() {
                            var params = {
                                bid: bid,
                                type: 'can_add',
                                uid: {}
                            };

                            params[AccountService.account.uid] = 1;
                            $scope.shared.can_add = [];
                            for(var i in $scope.checked_data){
                                if($scope.checked_data[i]){
                                    params.uid[i] = 1;
                                    $scope.shared.can_add.push({"uid":i});
                                }
                            }
                            CollectionService.tmp_collection.can_add = params;
                            // CollSharedService.saveShared(params).then(function(data){

                            // });
                        }
                    }]
                });
            } else {
                ToastService.showMessage("danger", "You don't have followers");
            }
        });
    }

    $scope.title_text = Object.keys($scope.collection).length ? 'Edit collection' : 'Add Collection';

    if($state.includes('add-collection')){
        $scope.collection = {};
        CollectionService.tmp_collection = {};
    }

    if(!$scope.collection.name || $scope.collection.name == ''){
        $scope.title_text = 'Add Collection';
    }


    $scope.addCollection = function() {
        if($state.includes('add-collection')){

            for(var s in CollectionService.tmp_collection){
                $scope.collection[s] = CollectionService.tmp_collection[s];
            }
            CollectionService.tmp_collection = $scope.collection;
        }
        if(!CollectionService.tmp_collection.name){
            ToastService.showMessage("danger", "Name of Collection is required");
            return;
        }
        if(CollectionService.tmp_collection.description && CollectionService.tmp_collection.description.length > 500){
            ToastService.showMessage("danger", "Description should be under 500 symbols");
            return;
        }
        CollectionService.add(CollectionService.tmp_collection).then(function(data){
            $scope.succ_mess = "Collection succesfully added";
            if ($state.params.collectionId) {
                CollectionService.editCollectionCallback($scope.collection);
            }
            else {
                if($state.params.action != 'account'){
                    CollectionService.collectionId = data.data.bid;
                    $state.go($state.params.action, {clipId: $state.params.clipId});
                }
                CollectionService.addCollectionCallback($scope.collection);
            }
            HttpService.addNoCache('user_collections');
        }, function(reason) {
            ToastService.showDrupalFormMessage("danger", reason.data);
        });
    }

    $scope.deleteCollection = function(bid) {
        var confirmPopup = $ionicPopup.confirm({
            title: 'Delete Collection',
            cssClass: 'confirm',
            template: 'Are you sure you want to delete this collection?'
        });
        confirmPopup.then(function(res) {
            if(res) {
                CollectionService.delete(bid).then(function(data){
                    ToastService.showMessage("success", "Collection successfully deleted");
                    HttpService.clearCache();
                    $state.go("account.collections", {userId : UserService.user.uid});
                }, function(reason) {
                    ToastService.showDrupalFormMessage("danger", reason.data);
                });
            }
        });
    }

    // CollSharedService
});

angular.module('bazaarr').controller('CollectionCoverCtrl', 
function($scope, $rootScope, $state, $timeout, collection, FollowService, CollectionService, HttpService, ToastService, ClipsService, ClipService) {
    $scope.collection = CollectionService.collections[$state.params.colId]; //collection.data[0];
    
    //CollectionService.getCounters($state.params.colId);
    
    $scope.openClip = function(clipId) {
        ClipsService.load("collection_clips", false, {bid : $state.params.colId}).then(function(data) {
            ClipsService.prepare(data.data, "", true);
            ClipService.page_list       = ClipsService.page_api_url;
            $state.go("clip", {"clipId" : clipId});
        });
    };
    
    $scope.followCollection = function(bid, type) {
        var send_type       = (1 === type) ? 0 : 1;

        FollowService.followCollection(bid, send_type).then(function(data){
            $scope.collection.follow = send_type;
            FollowService.followCollectionCallback(data.data.user_follow);
        });
    };

    $scope.accept_collection = function(coll, type) {
        var bid = coll.bid;

        CollectionService.accept_collection(bid, type).then(function(data){
            if(type == 0 || type == 3){
                $state.go('account.collections', {"userId" : $rootScope.user.uid});
            } else {
                $scope.collection.accepted = '1';
            }
            HttpService.clearCache();

            ToastService.showMessage("success", data.data.messages.status[0]);
        });
    };
    
    $scope.addClipFromCollection = function(collection) {
        CollectionService.add_clip_collection = collection;
        $state.go("add");
    }

    $scope.goEditCollection = function(bid) {
        $state.go("edit-collection", {collectionId : bid});
    };
    
    $scope.$on('update:collection_titles', function(event, args) {
        if (angular.isDefined(CollectionService.collections[args.bid])) {
            $scope.collection   = CollectionService.collections[args.bid];
        }
    });
});

angular.module('bazaarr').controller('InputCtrl', function($scope, $rootScope, $ionicPopup, $timeout, $cordovaKeyboard, ValidateService, ToastService) {
    $scope.openPopup = function(type, scope_var, value, title, buttons) {
        $scope.popup        = {};
        $scope.popup.model  = value;
        $scope.popup.add    = {};
        
        if (angular.isDefined($scope.$parent.$parent.clip) && angular.isDefined($scope.$parent.$parent.clip.category)) {
            $scope.tid = $scope.$parent.$parent.clip.category.tid;
        }
        else if (angular.isDefined($scope.$parent.$parent.collection)) {
            $scope.tid = $scope.$parent.$parent.collection.tid;
        }
        
        var default_buttons = type.indexOf('select') === 0 ? [{
                text: 'Cancel'
            }
        ]:[
            {
                text: 'Cancel'
            },
            {
                text: 'Save',
                onTap: function(e) {
                    if(angular.isDefined($scope.popup.add.validate)){
                        // switch($scope.popup.add.validate){
                        //     case 'current_pass':
                        //         break;
                        // }
                        if(angular.isUndefined($scope.popup.add.current_pass) || !$scope.popup.add.current_pass || $scope.popup.add.current_pass == ''){
                            ToastService.showMessage("danger", "Please set your password!");
                            e.preventDefault();
                            return;
                        }
                    }

                    if (!ValidateService.validate($scope.popup.model, type, title)) {
                        e.preventDefault();
                        return false;
                    }
                    p(scope_var);
                    scope_var = scope_var.split(".");
                    if(typeof scope_var[2] != 'undefined'){
                        if(typeof $scope[scope_var[0]][scope_var[1]] == 'undefined') {
                            $scope[scope_var[0]][scope_var[1]] = {};
                        }
                        $scope[scope_var[0]][scope_var[1]][scope_var[2]] = $scope.popup.model;
                    } else {
                        $scope[scope_var[0]][scope_var[1]] = $scope.popup.model;
                    }

                    for(var i in $scope.popup.add){
                        $scope[scope_var[0]][i] = $scope.popup.add[i];
                    }
                    
                }
            }
        ];

        if(buttons){
            default_buttons = buttons;
        }

        $scope.popup.sel = $ionicPopup.show({
            title: title, //(type.indexOf('select') === 0 ? 'Select ' : 'Enter ') +
            templateUrl: 'views/popups/inputs/' + type + '.html',
            scope: $scope,
            cssClass: type + (type.indexOf('select') === 0 ? ' select ' : ''),
            buttons: default_buttons
        });

        $timeout(function(){
            var popupInput = document.querySelector('.popup-body textarea, .popup-body input');
            if(popupInput){
                popupInput.focus();
                if ($rootScope.is_app) {
                    $cordovaKeyboard.show();
                }
            }
        }, 400);
    }
    $scope.popupSelectClick = function(name, value, title) {
        var scope_var = name.split(".");
        if(typeof value == 'object') {
            $scope[scope_var[0]][scope_var[1]+'_from'] = value[0];
            $scope[scope_var[0]][scope_var[1]+'_to'] = value[1];
            if(title) {
                $scope[scope_var[0]][scope_var[1]+'_title'] = title;
            }
            $scope[scope_var[0]][scope_var[1]] = value;
        } else {
            if(typeof scope_var[2] != 'undefined'){
                if(typeof $scope[scope_var[0]][scope_var[1]] == 'undefined') {
                    $scope[scope_var[0]][scope_var[1]] = {};
                }
                $scope[scope_var[0]][scope_var[1]][scope_var[2]] = value;
                if(title) {
                    $scope[scope_var[0]][scope_var[1]][scope_var[2]+'_title'] = title;
                }
            } else {
                $scope[scope_var[0]][scope_var[1]] = value;
                if(title) {
                    $scope[scope_var[0]][scope_var[1]+'_title'] = title;
                }
            }
        }
        $scope.popup.sel.close();
    }
    $scope.popupCategorySelect = function(value, title) {
        if (angular.isDefined($scope.clip)) {
            $scope.clip.category = {tid: value, name: title};
        }
        if (angular.isDefined($scope.collection)) {
            $scope.collection.tid               = value;
            $scope.collection.category_name     = title;
        }
        $scope.popup.sel.close();
    }
});

angular.module('bazaarr').service('ValidateService', function(ToastService) {
    this.validate = function(value, type, title) {
        title = title || type;
        if (angular.isDefined(this.validate[type]) && !this.validate[type](value)) {
            ToastService.showMessage("danger", "Please, enter correct " + title.toLowerCase());
            return false;
        }

        return true;
    };

    this.validate.number = function(value) {
        var re = /^([\d]+(\.{1}[\d]{1,2})?)$/i;
        if (!re.test(value)) {
            return false;
        }

        return true;
    };

    this.validate.url = function(value) {
        var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator

        if(!pattern.test(value)) {
            return false;
        }

        return true;
    }
});

angular.module('bazaarr').service('CollectionService',
function($rootScope, $state, $q, $timeout, localStorageService, AccountService, ClipsService, HttpService, ToastService, UserService) {
    this.collections = [];
    this.collectionId = 0;
    this.tmp_collection = {};
    this.users = {};

    this.add_clip_collection = {};

    this.accept_collection = function(bid, type) {

        HttpService.view_url = "collection/shared/" + bid;
        HttpService.params   = {"data": {"type":type}};

        return HttpService.post();
    };

    this.singleLoad = function(bid) {
        if(this.collections[bid]){
            return $q.when({"data": [this.collections[bid]]});
        }
        
        HttpService.view_url = "user_collections";
        HttpService.params   = {"bid" : bid};
        HttpService.is_auth  = false;
        HttpService.cache    = false;

        var promise = HttpService.get();
        var that    = this;
        promise.then(function(data) {
            that.collections[bid] = data.data[0];
            that.getCounters(bid);
        });
        
        return promise;
    };
    
    this.load = function(uid) {
        var cur_uid = AccountService.account_id || UserService.user.uid;
        uid = uid || cur_uid;

        HttpService.view_url = "user_collections";
        HttpService.params   = {"uid" : uid};
        HttpService.is_auth  = false;

        return HttpService.get();
    };

    this.load2 = function(uid) {
        var cur_uid = AccountService.account_id || UserService.user.uid;
        uid = uid || cur_uid;

        HttpService.view_url = "get_user_collections/" + uid;
        // HttpService.params   = {"uid" : uid};
        HttpService.is_auth  = false;

        return HttpService.get();
    };

    this.prepare = function(data) {
        var j = 0;

        for (var i in data) {
            if(typeof data[i].accepted != 'undefined'){
                data[i].accepted = parseInt(data[i].accepted);
            }
            // if (!!data[i].imgs === true) {

            //     data[i].imgs_r = ClipsService.applyOrientation(data[i].imgs, "collection");
            //     j++;
            // }
            if (angular.isUndefined(data[i].follow)) {
                data[i].follow = parseInt(data[i].followed);
            }

            if ($rootScope.isMyAccount() && $state.includes("account.following-collections")) {
                data[i].follow = 1;
            }

            if ($rootScope.isMyAccount() && $state.includes("account.collections")) {
                data[i].can_edit = true;
            }
            else {
                data[i].can_edit = false;
            }

            if(data[i].access_add && data[i].access_add.length > 1) {
                data[i].is_shared = true;
            }
            else {
                data[i].is_shared = false;
            }

            this.collections[data[i].bid] = data[i];
        }

        return this.applyOrientation(data);
    };
    
    this.applyOrientation = function(data) {
        var cols = this.getColsNumber();
        
        return ClipsService.chunk_table(data, cols);
    };

    this.getColsNumber = function() {
        var cols = 3;

        if (window.matchMedia("(orientation: landscape)").matches) {
           cols = 5;
        }

        if (ionic.Platform.isIPad()) {
            cols++;
        }

        return cols;
    };
    
    this.add = function(collection) {
        var method = "post";
        HttpService.view_url = "collection";

        HttpService.params   = collection;


        if(collection.bid && collection.bid != 'new'){
            HttpService.view_url += "/" + collection.bid;
            return HttpService.put();
        }

        return HttpService.post();
    };

    this.delete = function(bid) {
        HttpService.view_url = "collection/" + bid;

        return HttpService.dell();
    };

    this.getCategories = function(vid){
        HttpService.view_url    = "getCategories";
        HttpService.is_auth     = false;
        HttpService.params      = {};

        return HttpService.get();
    };

    this.addCollectionCallback = function(collection) {

        ToastService.showMessage("success", "The collection " + collection.name + " is created");
        AccountService.updateCounters('collections_count', 1);

        this.editCollectionCallback(collection);
    };

    this.editCollectionCallback = function(collection) {
        if(!this.collectionId){
            HttpService.addNoCache("user_collections");
            HttpService.clearCache();
            $state.go("account.collections", {userId : UserService.user.uid});
        }
    };

    this.findCollection = function(bid) {
        var ret = "";

        var session = localStorageService.get("session");

        angular.forEach(session.collections, function(value, key) {
            if (value.bid === bid) {
                ret = value;
            }
        });
        return ret;
    };

    this.revertFollow = function(collections, type) {
        angular.forEach(collections, function(value, key) {
            value.follow = type ? 1 : 0;
        });
        return collections;
    };
    
    this.updateCollectionField = function(bid, field, value, operation) {
        if (!this.collections[bid] || !this.collections[bid][field]) {
            return false;
        }
        
        switch (operation) {
            case "increment":
                this.collections[bid][field] = parseInt(this.collections[bid][field]) + value;
                break;
            case "update":
                this.collections[bid][field] = value;
                break;
        }
    };
    
    this.getCounters = function(bid) {
        if (angular.isUndefined(this.collections[bid]) || angular.isDefined(this.collections[bid].count_clips)) {
            return false;
        }
        
        HttpService.view_url    = "collection-counters/" + bid;
        HttpService.is_auth     = false;
        
        var that = this;
        HttpService.get().then(function(data) {
            angular.extend(that.collections[bid], data.data);
        });
    }
});

angular.module('bazaarr').service('CollSharedService', function(AccountService, ClipsService, HttpService) {
    // this.collection = {
    // };

    this.type = {};

    this.users = {};

    this.saveShared = function(params){

        HttpService.view_url = "shared/";
        HttpService.params = params;

        return HttpService.post();
    }

    this.loadData = function(bid){

        HttpService.view_url = "collection/" + bid;
        HttpService.params = {"data": 1};
        HttpService.cache = false;

        return HttpService.get();
    }

    this.searchText = function(text){

        HttpService.view_url = "collection/getUsers";
        HttpService.params = {"text": text};
        HttpService.cache = false;

        return HttpService.post();
    }

});
;'use strict';

angular.module('bazaarr').controller('LoginCtrl',
function($scope, $rootScope, $state, $cookies, $cordovaPush,
UserService, RegistrationService, DeviceAdapterService, CollectionService, ToastService, HttpService) {
    if (UserService.is_login) {
        $state.go('account.collections', {"userId" : UserService.user.uid});
        return false;
    }

    $scope.getToken = function() {
        UserService.getToken().then(function(data) {
            UserService.token = data.data;
            $cookies["CSRF-TOKEN"]              = data.data;

            //$scope.isConnect();
            $state.go('user.collections');
        });
    }

    $scope.isConnect = function() {
        UserService.isConnect().then(function(data) {
            p(data.data.user);
        });
    }

    $scope.signIn = function(user, type) {
        if (UserService.is_login) {
            $state.go('account.collections', {"userId" : UserService.user.uid});
            return false;
        }
        //UserService.clearCookies();
        /*if (DeviceAdapterService.is_ready && ionic.Platform.isAndroid()) {
            var config = DeviceAdapterService.getAndroidPushConfig();
            $cordovaPush.register(config).then(function(result) {
                user.device_id = result;
                $scope.login(user, type);
            }, function(err) {
                ToastService.showMessage("danger", "Device registration error: " + err);
            });
        }
        else {*/
            user.device_id = "";
            $scope.login(user, type);
        //}
    }

    $scope.login = function(user, type) {
        UserService.signIn(user, type).then(function(data) {
            CollectionService.user_collections  = data.data.collections;
            HttpService.clearCache();
            UserService.loginCallback(data.data);
        },
        function(reason) {
            UserService.clearUser();
            ToastService.showMessage("danger", reason.data);
        });
    }

    $scope.create = function(user) {
        RegistrationService.add(user).then(function(data){
            var login = {};
            login.username = user.name;
            login.password = user.pass;
            $scope.signIn(login);

        }, function(reason){
            ToastService.showDrupalFormMessage("danger", reason.data);
        });
    };

    var domain = window.location.host.split('.').pop(),
        appId = '';
    switch(domain){
        case 'dev':
        case 'org':
            appId = 430153587174464;
            break;
        case 'net':
            appId = 430153653841124;
            break;
        case 'com':
            appId = 302850933231229;
            break;
    }
    openFB.init({appId: appId});

    $scope.fbLogin = function() {
        openFB.login(function(response) {
            if (response.status === 'connected') {
                openFB.api({
                    path: '/me',
                    success: function(data) {
                        data.is_fb = true;

                        $scope.signIn(data, "social");
                    }
                });
                p('Facebook login succeeded, got access token: ' + response.authResponse.token);
            }
            else {
                p('Facebook login failed: ' + response.error);
            }
        }, {scope: 'email,read_stream,user_about_me,user_birthday,user_friends,user_hometown,user_website,publish_actions'});//'email,read_stream,publish_stream'
    };
    /* denysovpavlo@gmail.com
     * 548F12cab
     */


    //$scope.getToken();
    $scope.user = {};
    /*$scope.user.username = "admin";
    $scope.user.password = "abcd1234";*/

    //$scope.signIn(user);
});

angular.module('bazaarr').controller('ForgotPasswordCtrl', function($scope, ForgotPasswordService, ToastService) {
    $scope.forgot = {};
    $scope.forgot.name = "";
    $scope.sendPassword = function(name) {
        ForgotPasswordService.sendPassword(name).then(function(data) {
            $scope.forgot.name = "";
            ToastService.showMessage("success", "Further instructions have been sent to your e-mail address");
        }, function(reason) {
            ToastService.showMessage("danger", reason.data);
        });
    };
});

angular.module('bazaarr').controller('ResetPasswordCtrl',
function($state, ForgotPasswordService) {
    var hash_data = {};
    hash_data.uid           = $state.params.userId
    hash_data.timestamp     = $state.params.timestamp;
    hash_data.hashed_pass   = $state.params.hash;
    ForgotPasswordService.hashLogin(hash_data);
});

angular.module('bazaarr').controller('LoginLinkCtrl',
function(LoginService) {
    LoginService.remoteLogin();
});

angular.module('bazaarr').service('LoginService',
function($state, $rootScope, HttpService, UserService, ToastService, CollectionService) {
    this.remoteLogin = function() {
        if (angular.isDefined(UserService.user.uid) && UserService.user.uid) {
            this.remoteLoginCallback();
            return true;
        }
        HttpService.view_url    = "remote-login";
        HttpService.is_auth     = false;
        HttpService.params      = {"hash" : $state.params.hashLogin};
        var promise = HttpService.post();

        var that = this;
        promise.then(function(data) {
            CollectionService.user_collections  = data.data.collections;
            UserService.store(data.data);
            that.remoteLoginCallback();
        }, function(reason) {
            ToastService.showMessage("danger", reason.data);
            $state.go("login");
        });
    };

    this.remoteLoginCallback = function() {
        var event = $state.params.event.split("_");
        switch (event[0]) {
            case "collections":
                $state.go("account.collections", {'userId' : UserService.user.uid})
                .then(function(){
                    p(event[1]);
                });
                break;
            case "like":
                $state.go("clip", {'clipId' : event[1]})
                .then(function(){
                    $rootScope.$broadcast('clip:like');
                });
                break;
        }
    }
    //http://bazaarr.dev/l/OtOJ0UobXBk_?destination=collections/127/accept
});

angular.module('bazaarr').service('ForgotPasswordService',
function($state, $q, HttpService, UserService, CollectionService, ToastService) {
    this.sendPassword = function(name) {
        if (!name) {
            return $q.reject({"data" : "Please enter your username or e-mail address"});
        }

        HttpService.view_url    = "user/request_new_password";
        HttpService.is_auth     = false;
        HttpService.params      = {"name" : name};
        return HttpService.post();
    };

    this.hashLogin = function(hash_data) {
        if (UserService.is_login) {
            ToastService.showMessage("danger", "You are already logged in");
            $state.go("account.collections", {"userId" : UserService.user.id});
            return false;
        }
        HttpService.view_url    = "hash-login";
        HttpService.is_auth     = false;
        HttpService.params      = hash_data;
        HttpService.post().then(function(data) {
            ToastService.showMessage("success",
                "You have just used your one-time login link. It is no longer necessary to use this link to log in. \n\
                Please change your password.");
            CollectionService.user_collections  = data.data.collections;
            data.data.user.forgot_password = 1;
            UserService.loginCallback(data.data);
        }, function(reason) {
            ToastService.showMessage("danger", reason.data);
            $state.go("forgot-password");
        });
    };
});
;var p = console.log.bind(console);

'use strict';

angular.module('bazaarr').controller('MainCtrl',
function($scope, $state, $rootScope, $ionicPopover, $ionicPopup,
MenuService, UserService, ToastService, ConfigService, HttpService) {
    //$scope.menus = MenuService.get();
    //$scope.title = MenuService.getTitle();

    $scope.setActive = function() {
        MenuService.setActive();
    }

    $scope.swipeLeft = function() {
        MenuService.nextMenu();

    }

    $scope.swipeRight = function() {
        MenuService.prevMenu();
    }

    $scope.isLogin = function() {
        var is_login = false;
        if (UserService.is_login) {
            //$scope.user = UserService.user;
            is_login = true;
        }

        return is_login;
    }

    $scope.logout = function() {
        UserService.logout().then(function(data) {
            HttpService.clearCache();
            UserService.clearUser();
            $state.go('login');
        }, function(reason) {
            HttpService.clearCache();
            UserService.clearUser();
            $state.go('login');
        });
    }

    $scope.addClip = function() {
        $state.go("add");
    };

    $scope.goHome = function() {
        $state.go('recent');
    };

    $scope.isSearch = function() {
        return SearchService.isSearch();
    };

    $scope.isCurrentAccount = function() {
        return $rootScope.isMyAccount() && $rootScope.isUserMenu();
    };

    $ionicPopover.fromTemplateUrl('views/menu/userAccount.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.userAccountPopover = popover;
    });

    $ionicPopover.fromTemplateUrl('views/menu/myAccount.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.myAccountPopover = popover;
    });

    $scope.openPopover = function($event) {
        if($scope.user.uid!=$state.params['userId']) {
            $scope.userAccountPopover.show($event);
        } else {
            $scope.myAccountPopover.show($event);
        }
    };
    $scope.closePopover = function() {
        if($scope.myAccountPopover){
            $scope.myAccountPopover.hide();
        }
        if($scope.userAccountPopover){
            $scope.userAccountPopover.hide();
        }
    };
    $scope.popoverLogout = function($event) {
        this.closePopover();
        this.logout();
    };
    $scope.goToEditProfile = function($event) {
        this.closePopover();
        $state.go('edit_profile')
    }
    $scope.goToEditAccount = function($event) {
        this.closePopover();
        $state.go('edit_account')
    }
    $scope.goToAboutAccount = function($event) {
        this.closePopover();
        $state.go('about-bazaarr')
    }
    $scope.goToAboutSupport = function($event) {
        this.closePopover();
        $state.go('support')
    }
    $scope.goUserMenu = function(path, params) {
        this.closePopover();
        $state.go(path, params);
    }

    $scope.goLogin = function() {
        ToastService.showMessage("danger", "Please sign in to continue");
        $state.go('login');
    }

    $scope.selectServer = function() {
        $scope.server_popup = $ionicPopup.show({
            title: "Select server",
            templateUrl: 'views/popups/select_server.html',
            scope: $scope,
            buttons: [
                { text: 'Cancel' }
            ]
        });
    }

    $scope.setServer = function(url) {
        HttpService.clearCache();
        ConfigService.setUrl(url);
        $scope.server_popup.close();
        window.location.reload();
    }

    $scope.checkBookmarkBar = function() {
        return !!window.localStorage['isBookmarkHidden'];
    }

    $scope.hideBookmarkBar = function() {
        window.localStorage.setItem('isBookmarkHidden', true);
    }

    $scope.resetInstructions = function() {
        window.localStorage.removeItem('isBookmarkHidden');
    }

    $scope.isAndroid = function() {
        return ionic.Platform.isAndroid();
    }

    $scope.isIOS = function() {
        return ionic.Platform.isIOS();
    }
});

angular.module('bazaarr').service('ArrayService', function() {
    this.dropKeys = function(arr){
        return arr.filter(function(){return true;})
    }
    this.url_domain = function (link) {
        var a = document.createElement('a');
        a.href = link;
        return a.hostname;
    }

});
angular.module('bazaarr').service('MenuService', function($ionicScrollDelegate, $stateParams, $location, $ionicTabsDelegate) {
    this.active_id = 0,

    this.get = function() {
        return [
            {"id" : "0", "name" : "Recent", "url" : "recent",
                "api" : {"url" : "views/clip_pages", "display_id" : "page_3"}},
            {"id" : "1", "name" : "Following", "url" : "following",
                "api" : {"url" : "views/clip_pages", "display_id" : "page_4"}},
            {"id" : "2", "name" : "Shop", "url" : "shop",
                "api" : {"url" : "views/clip_pages", "display_id" : "page_2"}},
            {"id" : "3", "name" : "Search", "url" : "search"},
            {"id" : "4", "name" : "My Account", "url" : "collections"},
            {"id" : "5", "name" : "Clips", "url" : "clips",
                "api" : {"url" : "views/clip_pages", "display_id" : "page_7"}},
            {"id" : "6", "name" : "Likes", "url" : "likes",
                "api" : {"url" : "views/clip_pages", "display_id" : "page_8"}},
        ];
    },
    /*
    this.setActive = function(url) {

        if (!url) {
            url = "clips/Recent";//$location.url();
        }

        var $menus        = document.body.querySelectorAll(".top-menu a");
        var $active_menu  = document.body.querySelector(".top-menu a[ng-href='#/" + url + "']");

        var number = 0;
        for (var i = 0; i < $menus.length; i++) {
            $menus[i].className = "";
            if ($menus[i] == $active_menu) {
                number = i;
            }
        }
        $active_menu.className = $active_menu.className + " active";
        if (number < 3) {
            $ionicScrollDelegate.$getByHandle('menu').scrollTo(0, 0, true);
        }
        else {
            $ionicScrollDelegate.$getByHandle('menu').scrollTo(number * 40, 0, true);
        }
        this.active_id = number;

    },*/

    this.setActiveMenuCss = function(index) {
        var $menus      = document.body.querySelectorAll(".main-menu a");

        for (var i = 0; i < $menus.length; i++) {
            $menus[i].className = "";
        }

        document.getElementById("main-menu_" + index).className = "active";
    },

    this.setActive = function(active_id) {
        this.active_id = active_id || $ionicTabsDelegate.selectedIndex() - 1;
    },

    this.getTitle = function() {
        var title = "Recent";

        if ($stateParams) {
            var url = "";
            if ($stateParams.contentTitle) {
                title = $stateParams.contentTitle;
                url = "content/" + title;
            }
            else if ($stateParams.clipsPage) {
                title = $stateParams.clipsPage;
                url = "clips/" + title;
            }
            else {
                return title;
            }
            //this.setActive(url);
        }

        return title;
    },

    this.getActiveMenu = function(url) {
        url = url || $location.url();
        url = url.replace(/\/:(.*)/, "");
        var menus = this.get();

        for (var i = 0; i < menus.length; i++) {
            if ("/" + menus[i].url == url) {
                return menus[i];
            }
        }

        return {};//menus[this.active_id];
    },

    this.nextMenu = function() {
        var menus = this.get();

        if (this.active_id >= menus.length) {
            return false;
        }

        $location.url(menus[this.active_id + 1].url);
        this.setActive(this.active_id + 1); //menus[this.active_id + 1].url
    },

    this.prevMenu = function() {
        var menus = this.get();

        if (this.active_id <= 0) {
            return false;
        }
        $location.url(menus[this.active_id - 1].url);
        this.setActive(this.active_id - 1); //menus[this.active_id - 1].url
    }
})
;'use strict';
angular.module('bazaarr').controller('SearchCtrl',
function($scope, $rootScope, $state, $ionicTabsDelegate, $cordovaKeyboard, SearchService, ToastService, CollectionService, ClipsService) {

    $scope.resetSearchResults = function(is_manual) {
        $scope.search = {
            search_api_views_fulltext:  "",
            price:                      ",",
            price_title:                "All",
            field_category:             "All",
            price_type:                 0,
            price_value:                0,
            type:                       0,
            search_api_clips_types:     0,
            sort_order:                 "DESC",
            sort_order_title:           "Descending",
            sort_by:                    "created",
            sort_by_title:              "Date"
        };

        $scope.searchColors = [
            {"r": 1,"g": 1,"b": 255},
            {"r": 1,"g": 132,"b": 200},
            {"r": 25,"g": 174,"b": 255},
            {"r": 114,"g": 47,"b": 69},
            {"r": 167,"g": 38,"b": 94},
            {"r": 139,"g": 1,"b": 1},
            {"r": 181,"g": 1,"b": 1},
            {"r": 220,"g": 1,"b": 1},
            {"r": 255,"g": 127,"b": 80},
            {"r": 255,"g": 102,"b": 1},
            {"r": 158,"g": 111,"b": 72},
            {"r": 184,"g": 129,"b": 1},
            {"r": 201,"g": 179,"b": 152},
            {"r": 39,"g": 35,"b": 88},
            {"r": 255,"g": 153,"b": 1},
            {"r": 255,"g": 192,"b": 34},
            {"r": 255,"g": 192,"b": 203},
            {"r": 255,"g": 255,"b": 62},
            {"r": 128,"g": 77,"b": 1},
            {"r": 154,"g": 222,"b": 1},
            {"r": 1,"g": 145,"b": 1},
            {"r": 241,"g": 202,"b": 255},
            {"r": 186,"g": 1,"b": 255},
            {"r": 204,"g": 204,"b": 204},
            {"r": 1,"g": 1,"b": 1},
            {"r": 255,"g": 255,"b": 255}
        ];

        $scope.users        = [];
        $scope.collections  = [];

        if(is_manual) {
            document.getElementsByClassName('search-top-input')[0].value = '';
        }
    };

    $scope.resetSearchResults();
    $scope.users        = [];
    $scope.collections  = [];

    CollectionService.getCategories(2).then(function(data){
        $scope.categories = data.data;
    });

    if($state.params && $state.params.query) {
        $scope.search.search_api_views_fulltext = $state.params.query;
        if($state.current.name == 'search-users') {
            SearchService.userSearch($scope.search.search_api_views_fulltext).then(function(data){
                $scope.users = data.data;
            });
        } else if ($state.current.name == 'search-collections') {
            SearchService.collectionSearch($scope.search.search_api_views_fulltext).then(function(data){
                $scope.collections = data.data;
            });
        } else if ($state.current.name == 'search-clips') {
            // Clips search page


        } else if ($state.current.name == 'search') {
            SearchService.userSearch($scope.search.search_api_views_fulltext, 5).then(function(data){
                $scope.users = data.data;
            });
            SearchService.collectionSearch($scope.search.search_api_views_fulltext, 5).then(function(data){
                $scope.collections = data.data;
            });
            // Add clips search
        }
    }

    /*
     * Function to hide keyboard on the IOS 8 if blur() doesn't work
     */
    function unfocusSearch() {
        document.activeElement.blur();
        if ($rootScope.is_app && ionic.Platform.isIOS()) {
            $cordovaKeyboard.close();
        }
    }

    $scope.goSearchResults = function(search) {
        if($scope.search.search_api_views_fulltext && $scope.search.search_api_views_fulltext.length >= 1){
            if($state.current.name == 'search-users') {
                SearchService.userSearch(search.search_api_views_fulltext).then(function(data){
                    $scope.users = data.data;
                });
            } else if ($state.current.name == 'search-collections') {
                SearchService.collectionSearch(search.search_api_views_fulltext).then(function(data){
                    $scope.collections = data.data;
                });
            } else if ($state.current.name == 'search') {
                SearchService.userSearch(search.search_api_views_fulltext, 5).then(function(data){
                    $scope.users = data.data;
                });
                SearchService.collectionSearch(search.search_api_views_fulltext, 5).then(function(data){
                    $scope.collections = data.data;
                });
                $scope.is_load_more = false;
                SearchService.params = search;
                SearchService.load().then(function(data) {
                    $scope.clips = data.data.length ? ClipsService.prepare(data.data, "", true) : {};
                });
            }
        } else {
            ToastService.showMessage("danger", "Please enter 1 or more symbols");
        }
        /*
        switch($ionicTabsDelegate.selectedIndex()){
            // clip search
            case 0:
                if (search.price) {
                    if(typeof search.price == 'object') {
                        var price_range = search.price;
                    } else {
                        var price_range = search.price.split(",");
                    }
                    search.price_value      = parseFloat(price_range[0]);
                    search.price_value_1    = parseFloat(price_range[1]);
                    if(isNaN(search.price_value)){
                        search.price_value = '';
                    }
                    if(isNaN(search.price_value_1)){
                        search.price_value_1 = '';
                    }
                }

                SearchService.page = 0;
                for(var i in search){
                    SearchService.params[i] = search[i];
                }

                SearchService.params.search_api_views_fulltext = encodeURIComponent(SearchService.params.search_api_views_fulltext);
                $state.go("search-results", {"hash" : new Date().getTime()}).then(function() {
                    unfocusSearch();
                });
            break;
            // user search
            case 2:
                if(search.search_api_views_fulltext && search.search_api_views_fulltext.length >= 1){
                    SearchService.userSearch(search.search_api_views_fulltext).then(function(data){
                        $scope.users = data.data;
                        if(!$scope.users.length){
                            ToastService.showMessage("danger", "We did not find any results for "+search.search_api_views_fulltext+", please type a new query.");
                        }
                        unfocusSearch();
                    });
                } else {
                    ToastService.showMessage("danger", "Please enter 1 or more symbols to search users!");
                }
            break;
            // collection search
            case 1:
                if(search.search_api_views_fulltext && search.search_api_views_fulltext.length >= 1){
                    SearchService.collectionSearch(search.search_api_views_fulltext).then(function(data){
                        $scope.collections = data.data;
                        if(!$scope.collections.length){
                            ToastService.showMessage("danger", "We did not find any results for "+search.search_api_views_fulltext+", please type a new query.");
                        }
                        unfocusSearch();
                    });
                } else {
                    ToastService.showMessage("danger", "Please enter 1 or more symbols to search collections!");
                }
            break;
        }
        */

    };

    $scope.goSearch = function() {
        $state.go('search');
    };

    $scope.isSearch = function() {
        return SearchService.isSearch();
    };
    $scope.selectColor = function(r,g,b){
        //if(r && g && b) {
            if($scope.search.color_r == r &&
                $scope.search.color_g == g &&
                $scope.search.color_b == b
            ) {
                $scope.search.color_r = '';
                $scope.search.color_g = '';
                $scope.search.color_b = '';
            } else {
                $scope.search.color_r = r;
                $scope.search.color_g = g;
                $scope.search.color_b = b;
            }
        //}
    };
    $scope.checkColor = function(r,g,b){
        if($scope.search.color_r == r &&
           $scope.search.color_g == g &&
           $scope.search.color_b == b
        ) {
            return 'active';
        }
    };
    $scope.selectType = function(type, from, to) {
        // switch(type){
        //     case 0:
        //     case 1:
        //         if($scope.search.sort_by == 'price_value'){
        //             $scope.search.sort_by           = 'created';
        //             $scope.search.sort_by_title     = 'Date';
        //             $scope.search.sort_order        = 'DESC';
        //             $scope.search.sort_order_title  = 'Descending';
        //         }
        //         break;
        //     case 2:
        //         if($scope.search.sort_by == 'created'){
        //             $scope.search.sort_by           = 'price_value';
        //             $scope.search.sort_by_title     = 'Price';
        //             $scope.search.sort_order        = 'ASC';
        //             $scope.search.sort_order_title  = 'Ascending';
        //         }
        //         break;
        // }

        $scope.search.price = from + ',' + to;
        $scope.search.price_value = from;

        if(type == 1) {
            if($scope.search.price_type != type) {
                $scope.search.lastSort = $scope.search.sort_by;
            }
            $scope.search.sort_by           = 'created';
            $scope.search.sort_by_title     = 'Date';
            // $scope.search.sort_order        = 'DESC';
            // $scope.search.sort_order_title  = 'Descending';
        } else {
            if($scope.search.lastSort && $scope.search.lastSort == 'price_value') {
                $scope.search.sort_by           = 'price_value';
                $scope.search.sort_by_title     = 'Price';
                // $scope.search.sort_order        = 'ASC';
                // $scope.search.sort_order_title  = 'Ascending';
            }
        }

        if(type == 2 && $scope.search.price_value_1 > 0) {
            $scope.search.price_type = type;
        } else {
            $scope.search.price_value_1 = to;
            $scope.search.price_type = type;
        }
    };
    $scope.selectSeachType = function(type) {
        $scope.search.type = type;
    };

    $scope.searchInputKeyPress = function(e, search) {
        // console.log(e);
        if (e.keyCode == 13) {
            $scope.goSearchResults(search);
        }
    }
});

angular.module('bazaarr').service('SearchService', function($state, $ionicLoading, UserService, server_url, HttpService, ClipsService) {
    this.params = {};

    this.page = 0;

    this.loadMore = function() {
        ClipsService.is_more = true;
        this.page += 1;
        return this.load();
    };

    this.collectionSearch = function(search, limit){
        HttpService.view_url = 'collections-search';
        HttpService.is_auth  = false;
        HttpService.params = {
            name: search
        };
        if(limit) {
            HttpService.params.limit = limit;
        }

        return HttpService.get();
    }

    this.userSearch = function(search, limit){
        HttpService.view_url = 'user-search';
        HttpService.is_auth  = false;
        HttpService.params = {
            name: search
        };
        if(limit) {
            HttpService.params.limit = limit;
        }

        return HttpService.get();
    }

    this.load = function() {
        HttpService.view_url = 'views/solr_clip_search';
        HttpService.page     = this.page;
        HttpService.params   = this.params;
        HttpService.cache    = false;
        HttpService.is_auth  = false;

        if (!HttpService.page) {
            ClipsService.newArr["search"]     = [];
            ClipsService.newArrSize["search"] = [];
            ClipsService.is_more = false;

            ClipsService.page_api_url = "search";
            ClipsService.is_user_page = false;
            $ionicLoading.show();
        }

        var ret = HttpService.get();
        ret.then(function(data) {
            $ionicLoading.hide();
        })

        return ret;

        //return HttpService.get();
    };

    this.getTitle = function() {
        if (!Object.keys(this.params).length
                || !!this.params.search_api_views_fulltext === false
                || !this.params.search_api_views_fulltext) {
            return "";
        }

        return decodeURIComponent(this.params.search_api_views_fulltext);
    },

    this.isSearch = function() {
        if ($state) {
            return $state.includes('search-results');
        }

        if (Object.keys(this.params).length) {
            return true;
        }

        return false;
    }
});
;'use strict';

angular.module('bazaarr').controller('ClaimCtrl', function($scope, $rootScope, $state, $ionicPopup, ClaimService, ToastService, DeviceAdapterService) {
    $scope.users    = [];
    $scope.search   = '';
    $scope.is_ready = DeviceAdapterService.is_ready;
    $scope.file     = null;
    $scope.params   = {
        claim: $state.params.userId,
        firstname: '',
        lastname: '',
        email: '',
        claim_image: 0,
        app: 1
    };

    $scope.goToClaim = function(uid, claim) {
        $state.go('claim-user', {"userId" : uid});
        return;


        if(!claim){
            $state.go('claim-user', {"userId" : uid});
            return;
        }
        $state.go('login');
    }

    $scope.searchInputKeyPress = function(e, search) {
        if (e.keyCode == 13) {
            $scope.goSearchResults(search);
        }
    }

    $scope.goSearchResults = function(search){
        ClaimService.load_users(search).then(function(data){
            $scope.users = data.data;
        });
    };

    $scope.validateClaim = function(params){
        if(params.firstname == ''){
            ToastService.showMessage('danger', 'Field Firstname is required!');
            return false;
        }
        if(params.lastname == ''){
            ToastService.showMessage('danger', 'Field Lastname is required!');
            return false;
        }
        if(params.email == ''){
            ToastService.showMessage('danger', 'Field Email is required!');
            return false;
        }

        return true;
    }

    $scope.submitClaim = function(params, claim_image){

        if(!$scope.validateClaim(params)){
            return false;
        }
        params.app = claim_image;

        ClaimService.claim(params).then(function(data){
            ToastService.showMessage("success", data.data.message);
            $state.go("account.collections", {userId : params.claim});
        },
        function(reason) {
            ToastService.showDrupalFormMessage("danger", reason.data);
        });
    }

    $scope.changedFile = function(element) {
        $scope.$apply(function($scope) {
            var f       = element.files[0],
                FR      = new FileReader();
            FR.onload   = function(e) {
                $scope.file    = e.target.result;
            };
            FR.readAsDataURL(f);
        });
    };

    $scope.openPhotoSourcePopup = function() {
        $scope.photo_source_popup = $ionicPopup.show({
            title: 'Select source',
            templateUrl: 'views/popups/photo_source.html',
            scope: $scope
        });
    };
});

angular.module('bazaarr').controller('ContactCtrl', function($scope, $state, AccountService, HttpService, ToastService) {
    $scope.contact = {
        uid: $scope.account.uid
    };

    $scope.sendMessage = function(contact){
        AccountService.contactAccount(contact).then(function(data){
            $scope.contact = {
                uid: $scope.account.uid
            };
            ToastService.showMessage("success", 'Message sent successfully!');
        },
        function(reason) {
            ToastService.showDrupalFormMessage("danger", reason.data);
        });
    }
});

angular.module('bazaarr').controller('AboutCtrl', function($scope, $timeout, $state, $sce, $ionicPlatform, AboutService, ConfigService) {
    if($state.includes('support')){

    } else {
        $scope.about_data = [];
        AboutService.loadVar('about_pages_data').then(function(data){
            if(data.data.length){
                for (var i = 0; i < data.data.length; i++) {
                    $scope.about_data.push({
                        title: data.data[i].form.item_name,
                        body: $sce.trustAsHtml(data.data[i].form.item_body.replace(/<a[^>]+>/gm, ''))
                    })
                };
            }
        });
    }

    if($scope.closePopover){
        $scope.closePopover();
    }

})

angular.module('bazaarr').directive('script', function() {
    return {
        restrict: 'E',
        scope: false,
        link: function(scope, elem, attr) {
            if (attr.type==='text/javascript-lazy') {
                var s = document.createElement("script");
                s.type = "text/javascript";
                var src = elem.attr('src');
                if(src!==undefined) {
                    s.src = src;
                } else {
                    var code = elem.text();
                    s.text = code;
                }
                document.head.appendChild(s);
                elem.remove();
            }
        }
    };
});

angular.module('bazaarr').controller('ProfileCtrl',
function($scope, $state, $ionicPopup, $ionicLoading, $cordovaCamera,
UserService, AccountService, DeviceAdapterService, ToastService, StateService, HttpService, userPicture) {
    if (!UserService.is_login) {
        $state.go('login');
        return false;
    }

    $scope.account      = angular.copy(UserService.user);
    $scope.image_src    = $scope.account.picture;
    $scope.file         = {};
    $scope.is_ready     = DeviceAdapterService.is_ready;
    var deff_pass = {
        confirmPassword: '',
        password: '',
        mess: null,
        is_valid: false
    };
    $scope.pass         = angular.copy(deff_pass);

    $scope.checkPass  = function(pass){
        $scope.pass.is_valid = false;
        if(!pass.password){
            $scope.pass.mess = ''; //Please set your password
            return '';
        }
        if(pass.password.length < 6){
            $scope.pass.mess = 'Password is too short';
            return 'error';
        }
        if(!pass.confirmPassword){
            $scope.pass.mess = 'Please fill Confirm Password field';
            return 'error';
        }
        if(pass.password != pass.confirmPassword){
            $scope.pass.mess = 'Passwords do not match';
            return 'error';
        }
        if(!pass.current_password && !UserService.user.forgot_password){
            $scope.pass.mess = 'Enter current password';
            return 'error';
        }

        $scope.pass.mess = null;
        $scope.pass.is_valid = true;

        return 'good';
    }
    $scope.passwordChange  = function(){
        $scope.popup = $ionicPopup.show({
            title: 'Change Password',
            templateUrl: 'views/popups/inputs/password.html',
            scope: $scope,
            cssClass: 'password',
            buttons: [
                {
                    text: 'Confirm',
                    onTap: function(e){
                        if($scope.pass.is_valid){
                            $scope.account.pass             = $scope.pass.password;
                            $scope.account.current_password = $scope.pass.current_password;
                        } else {
                            e.preventDefault();
                        }
                    }
                },{
                    text: 'Cancel',
                    onTap: function(e){
                        $scope.pass                         = angular.copy(deff_pass);
                    }
                }
            ]
        });
    };

    $scope.openPhotoPopup  = function(){
        userPicture.imgPopup($scope);
    };

    $scope.closeImagePopup  = function(){
        userPicture.closeImagePopup($scope);
    };

    $scope.saveAccount  = function(account, file){
        if(UserService.user.forgot_password && $scope.pass.password.length == 0){
            ToastService.showMessage("danger", "Please set your password!");
            return;
        }
        $scope.account.forgot_password = 0;

        $ionicLoading.show();

        saveAccount(account);
    };

    function saveAccount(account, file){
        AccountService.saveAccount(account, file).then(function(data){
            //$scope.suc_mess = "Profile saved successfully!";
            ToastService.showMessage("success", "Profile saved successfully!");
            if(!angular.isUndefined(file) && file.fid){
                account.picture = file.url;
                HttpService.clearCache();
            }

            delete account.forgot_password;
            delete account.pass_reset_token;
            delete account.pass;

            UserService.setUser(account);
            if(AccountService.account.uid == UserService.user.uid){
                AccountService.account = account;
            }

            StateService.go('account.collections', {"userId": account.uid}, 'profile:update');

            $ionicLoading.hide();
            $scope.pass = angular.copy(deff_pass);
        },
        function(reason) {
            $ionicLoading.hide();
            ToastService.showDrupalFormMessage("danger", reason.data);
        });
    }

    $scope.openPhotoSourcePopup = function() {
        userPicture.openPhotoSourcePopup($scope, DeviceAdapterService.is_ready);
    };

    $scope.changedFile = function(element) {
        userPicture.changedFile(element, $scope);
    };

    $scope.addPhoto  = function(type){
        userPicture.addPhoto(type, $scope, DeviceAdapterService);
    };
});

angular.module('bazaarr').controller('UserCtrl',
function($scope, $rootScope, AccountService, FollowService, ToastService, userPicture, DeviceAdapterService) {
    /*if (!UserService.is_login) {
        $state.go('login');
        return false;
    }*/

    $scope.account = AccountService.account;

    //AccountService.account = account.data;//!!account.data === true ? account.data : account;

    $scope.$on('profile:update', function(event) {
//p(AccountService.account);
        $scope.account = AccountService.account;
    });

    $scope.followUser = function(is_follow) {
        var type = (1 == is_follow) ? 0 : 1;
        FollowService.followUser(AccountService.getAccountId(), type).then(function(data) {
            $scope.account.is_follow = type;
            FollowService.followElseUserCallback(type);

            if(data.data.message){
                ToastService.showMessage("success", data.data.message);
            }
            // p(FollowService.colls);
            /*if(!data.data.user_follow){
                for(var t in FollowService.colls){
                    for(var i=0;i<FollowService.colls[t].length;i++){
                        for(var j=0;j<FollowService.colls[t][i].length;j++){
                            FollowService.colls[t][i][j].followed   = 0;
                            FollowService.colls[t][i][j].follow     = 0;
                        }
                    }
                }
            }*/

            //AccountService.updateCounts(); //UserService.updateCounts('following_count', type);
        });
    }


    /*$scope.backAccount = function() {

        var history = $ionicHistory.viewHistory();

        if (history.backView && history.backView.stateName.indexOf("account") === 0 && $rootScope.backState.length) {
            var prev_account = $rootScope.backState.pop();
            $rootScope.backEvent = true;
            $state.go(prev_account.state, prev_account.params);
        }
        else {
            $rootScope.back();
        }
    }*/

    $scope.openPhotoPopup  = function(){
        userPicture.imgPopup($scope);
    };

    $scope.openPhotoSourcePopup = function() {
        userPicture.openPhotoSourcePopup($scope, DeviceAdapterService.is_ready);
    };

    $scope.changedFile = function(element) {
        userPicture.changedFile(element, $scope);
    };

    $scope.closeImagePopup  = function(){
        userPicture.closeImagePopup($scope);
    };

    $scope.addPhoto  = function(type){
        userPicture.addPhoto(type, $scope, DeviceAdapterService);
    };

    $scope.toggleUserDesc = function(open) {
        if($scope.account.about.length > 150) {
            $scope.isDescOpen = open;
        }
    }
});

angular.module('bazaarr').controller('FollowCtrl',
function($scope, $rootScope, $state, FollowService, AccountService, CollectionService, HttpService, follows) {
    /*$scope.follows = follows.data.map(function(fol) {
        fol.type = FollowService.type;
        return fol;
    });*/

    $scope.follows = follows.data;

    $scope.followUser = function(uid, type, index) {
        FollowService.followUser(uid, type).then(function(){
            $scope.follows[index].type = (0 === type) ? 1 : 0;
            FollowService.followUserCallback(type);
            //AccountService.updateCounts(); //UserService.updateCounts('following_count', type);
        });
    }

    $scope.goFollowing = function() {

    }

    $scope.$parent.doRefresh = function() {
        var promise = {};
        if ($state.includes("account.following-users")) {
            HttpService.addNoCache("following-users");
            promise = FollowService.loadFollowing();
        }
        else if ($state.includes("account.followers")) {
            HttpService.addNoCache("followed-users");
            promise = FollowService.loadFollowers();
        }
        else {
            return false;
        }

        AccountService.update();

        promise.then(function(data) {
            $scope.follows = data.data;

            $rootScope.$broadcast('scroll.refreshComplete');
        });
    };
});

angular.module('bazaarr').controller('EmailNotificationCtrl',
function($scope, $state, $ionicPopup, $timeout, EmailNotificationService, UserService, ToastService) {
    if (!UserService.is_login) {
        UserService.post_login.redirect     = "email-notification";
        ToastService.showMessage("danger", "Please sign in to continue");

        $state.go('login');
        return false;
    }

    $scope.notifications    = {};

    $scope.mail_speed_name = "Once a day at most";

    $scope.selectMailSpeed = function() {
        $scope.mail_speed_popup = $ionicPopup.show({
            title: "Select server",
            templateUrl: 'views/popups/inputs/select-mail_speed.html',
            scope: $scope,
            buttons: [
                { text: 'Cancel' }
            ]
        });
    }

    $scope.setMailSpeed = function(name, value) {
        $scope.mail_speed_name          = name;
        $scope.notifications.mail_speed = value;
        $scope.mail_speed_popup.close();
        this.saveSettings($scope.notifications);
    }
    var tpromise = null;
    $scope.saveSettings = function(notifs) {
        if(tpromise){
            $timeout.cancel(tpromise);
        }
        tpromise = $timeout(function(){
            EmailNotificationService.saveNotifs(notifs, UserService.user.uid).then(function(data){
                ToastService.showMessage("success", "Notification settings successfully saved!");
            });
        }, 1000);
    }

    EmailNotificationService.loadSubscribes(UserService.user.uid).then(function(data){
        $scope.notifications = data.data;
        if($scope.notifications.mail_speed == 'immediate'){
            $scope.mail_speed_name = 'When they happen';
        }
    });
});

angular.module('bazaarr').controller('UserListCtrl',
function($scope, users, UserListService) {
    $scope.users = users.data;
    $scope.title = UserListService.title;
});

angular.module('bazaarr').service('UserListService',
function(HttpService) {
    this.getReclips = function(nid) {
        this.title = 'Reclips';
        HttpService.view_url    = "users-recliped-clip";
        HttpService.params      = {nid: nid};
        return HttpService.get();
    };

    this.getLikes = function(nid) {
        this.title = 'Likes';
        HttpService.view_url    = "users-liked-clips";
        HttpService.params      = {nid: nid};
        return HttpService.get();
    };
});


angular.module('bazaarr').service('EmailNotificationService',
function(HttpService) {
    this.saveNotifs = function(notifs, uid){
        HttpService.view_url    = "subscribes/" + uid;
        HttpService.params = {
            data: notifs
        };
        return HttpService.put();
    }

    this.loadSubscribes = function(uid){
        HttpService.view_url    = "subscribes/" + uid;
        HttpService.cache       = false;

        return HttpService.get();
    }
});

angular.module('bazaarr').service('StateService', function($state, $rootScope, UserService) {
    this.go = function(state, params, broadcast) {
        $state.go(state, params).then(function() {
            if (broadcast) {
                $rootScope.$broadcast(broadcast);
            }
        });
    };

    this.goMyAccount = function() {
        this.goAccount(UserService.user.uid);
    };

    this.goAccount = function(uid) {
        $state.go("account.collections", {userId : uid});
    };

    this.goFeed = function(nid) {
        $state.go("feed", {clipId : nid});
    }
});

angular.module('bazaarr').service('AboutService', function($state, $rootScope, HttpService) {
    this.loadVar = function(name){
        HttpService.view_url    = "system/get_variable";
        HttpService.params      = {
            name: name
        };

        return HttpService.post();
    }
});

angular.module('bazaarr').service('ToastService', function(ngToast) {
    this.showMessage = function(type, message) {
        if (angular.isUndefined(message) || message.length === 0) {
            return false;
        }
        ngToast.create({
            className: type,
            content: message
        });
    };

    this.showDrupalFormMessage = function(type, message) {
        var toast_mess = "";
        angular.forEach(message.form_errors, function(value, key) {
            value = value.replace(/href=\"\/user\/password\"/gi, 'href="#/forgot-password"');
            toast_mess += value + "<br />";
        });
        this.showMessage(type, toast_mess);
    };
});

angular.module('bazaarr').service('RegistrationService',
function($q, HttpService, ToastService) {
    this.add = function(user) {
        if (!this.validate(user)) {
            return $q.reject({"data" : ""});
        }

        HttpService.view_url    = "user/register";
        HttpService.is_auth     = false;
        HttpService.params      = user;

        return HttpService.post();
    };

    this.validate = function(user) {
        if (angular.isUndefined(user.name)) {
            ToastService.showMessage("danger", "Please, enter your Username");
            return false;
        }
        if (user.name.length < 3) {
            ToastService.showMessage("danger", "Username should be longer than 3 characters");
            return false;
        }
        /*if (angular.isUndefined(user.mail)) {
            ToastService.showMessage("danger", "Please, enter your E-mail");
            return false;
        }*/
        var re = /^([A-Za-z0-9]{1}[\w-]*(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
        if (angular.isUndefined(user.mail) || !re.test(user.mail)) {
            ToastService.showMessage("danger", "Please, enter correct e-mail");
            return false;
        }
        if (angular.isUndefined(user.pass)) {
            ToastService.showMessage("danger", "Please, enter your Password");
            return false;
        }
        if (user.pass.length < 6) {
            ToastService.showMessage("danger", "Password should be longer than 6 characters");
            return false;
        }




        return true;
    };
});

angular.module('bazaarr').service('AccountService',
function($rootScope, $state, $timeout, HttpService, UserService) {
    this.account        = {};
    this.account_id     = 0;
    this.is_my_account  = true;

    this.counts_update  = false;

    this.fileLoad = function(fid) {
        HttpService.view_url    = "file/" + fid;

        return HttpService.get();
    }

    this.contactAccount = function(contact) {
        HttpService.view_url    = "contact";
        HttpService.params      = {
            "contact": contact
        };

        return HttpService.post();
    }

    this.loadAbout = function() {

        return this.account_id || UserService.user.uid;
    };

    this.getAccountId = function() {
        return this.account_id || UserService.user.uid;
    };

    this.getAccount = function() {
        return !!this.account.uid ? this.account : UserService.user;
    };

    this.load = function(uid) {
        /*
        if ((0 === uid || (uid === this.account_id)) && !this.counts_update) {
            return this.account;
        }*/

        this.account_id     = uid;
        this.is_my_account  = false;
        if (UserService.user.uid === uid) {
            this.is_my_account  = true;
            this.counts_update  = false;
            //this.account        = UserService.user;
            //return this.account;
        }

        HttpService.view_url = "user/" + uid;
        //HttpService.view_url = "user-info";
        //HttpService.params   = {"uid" : uid};
        HttpService.is_auth  = false;
        //HttpService.cache    = false;

        var promise = HttpService.get();
        var that = this;
        promise.then(function(data) {
            that.account = data.data;
            if(that.account.about && that.account.about.length > 150) {
                var obj = new CutString(that.account.about, 150);
                that.account.about_short = obj.cut();
                if(that.account.about_short.length - that.account.about_short.lastIndexOf('...') == 3) {
                    that.account.about_short = that.account.about_short.substr(0, that.account.about_short.lastIndexOf ('...')) + ' <span class="expand">(More...)</span>'
                }
            } else {
                that.account.about_short = that.account.about;
            }
            $timeout(function() {
                $rootScope.$broadcast("profile:update");
            }, 200);
        });
        return promise;
    };

    this.saveAccount = function(account, file){
        // p(account);return
        HttpService.view_url = "user/" + account.uid;
// "pass-reset-token"
        var params = {
            "data": {
                "uid" : account.uid,
                "name" : account.name,
                "description" : account.about,
                "website" : account.website,
                "location" : account.location
            }
        };

        if(account.current_pass){
            params.data.current_pass = account.current_pass;
        }
        if(UserService.user.mail != account.mail && account.current_pass){
            params.data.mail            = account.mail;
            params.data.current_pass    = account.current_pass;
        }
        if(account.pass){
            params.data.pass            = account.pass;
            params.data.current_pass    = account.current_password;
        }
        if(file){
            params.data.picture = file.fid;
        }


        HttpService.params = params;
        if(UserService.user.forgot_password){
            HttpService._params = {
                'pass-reset-token': UserService.user.pass_reset_token
            };
        }

        return HttpService.put();
    }

    this.addFile = function(file, account) {
        if(typeof file.fid == 'undefined'){
            return false;
        }

        file.filename = "device.jpg";
        file.filepath = "public://pictures/" + file.filename;

        HttpService.view_url = "file";
        HttpService.params   = file;
        return HttpService.post();
    }

    /* don't use this */
    this.updateCounts = function() {
        this.counts_update = true;
    };

    /* use this */
    this.updateCounters = function(counter_name, type, not_my_account) {
        not_my_account = not_my_account || false;
        HttpService.addNoCache("user/" + UserService.user.uid);
        if (this.account_id == UserService.user.uid || not_my_account) {
            var counter = parseInt(this.account[counter_name]);
            this.account[counter_name] = type ? counter + 1 : counter - 1;
            $rootScope.$broadcast("profile:update");
        }
    };

    this.update = function() {
        var that = this;
        HttpService.addNoCache("user/" + this.getAccountId());
        this.load($state.params.userId).then(function(data) {
            that.account = data.data;
            $rootScope.$broadcast("profile:update");
        });
    };
});

angular.module('bazaarr').service('FollowService',
function($rootScope, $ionicHistory, HttpService, AccountService, CollectionService) {
    this.params = {};
    this.type   = 0;

    this.colls = {};
    this.loadFollowing = function() {
        this.type = 0;
        HttpService.view_url = "following-users";
        HttpService.params   = {"uid" : AccountService.getAccountId()};
        HttpService.is_auth  = false;
        var promise = HttpService.get();

        return this.preRender(promise);
    };

    this.loadCollections = function() {
        HttpService.view_url = "collections-followed";
        HttpService.params   = {"uid" : AccountService.getAccountId()};
        HttpService.is_auth  = false;
        return HttpService.get();
    };

    this.loadFollowers = function() {
        this.type = 1;
        HttpService.view_url = "followed-users";
        HttpService.params   = {"uid" : AccountService.getAccountId()};
        HttpService.is_auth  = false;
        var promise = HttpService.get();

        return this.preRender(promise);
    };

    this.followUser = function(uid, type) {
        HttpService.addNoCache("user/" + uid);
        HttpService.view_url = "follow/" + uid;
        HttpService.params   = {"type" : "user", "action" : type};
        return HttpService.put();
    };

    this.followCollection = function(bid, type) {
        HttpService.view_url = "follow/" + bid;
        HttpService.params   = {"type" : "collection", "action" : type};
        var promise = HttpService.put();
        promise.then(function(){
        	CollectionService.updateCollectionField(bid, "followed", type, "update");
        });
        return promise;
    };

    this.followUserCallback = function(type) {
        this.clearCache();
        AccountService.updateCounters('following_count', type);
    };

    this.followElseUserCallback = function(type) {
        this.followUserCallback();

        AccountService.updateCounters('followers_count', type, true);
        $rootScope.$broadcast("collections:follow", {type : type});
    };

    this.clearCache = function() {
        HttpService.addNoCache("following-users");
        HttpService.addNoCache("followed-users");
        HttpService.addNoCache("following");
        HttpService.addNoCache("collections-followed");
        HttpService.addNoCache("get_user_collections/" + AccountService.getAccountId());
        HttpService.addNoCache("user/" + AccountService.getAccountId());
        //$ionicHistory.clearCache();
    }

    this.preRender = function(promise) {
        var type = this.type;

        promise.then(function(data){
            data.data = data.data.map(function(d) {
                d.type = 1;
                if (0 === type || angular.isDefined(d.is_folowed)) {
                    d.type = 0;
                }

                return d;
            });
        });

        return promise;
    };

    this.followCollectionCallback = function(user_follow) {
        this.clearCache();
        if (user_follow === false) {
            HttpService.addNoCache("following-users");
            HttpService.addNoCache("followed-users");

            AccountService.updateCounters('following_count', 0);
        }
    };
});

angular.module('bazaarr').service('HttpService',
function($q, $http, $cacheFactory, $rootScope, $ionicLoading, $ionicHistory, $cordovaNetwork,
ConfigService, UserService, DeviceAdapterService, ToastService) {
    this.view_url   = "";
    this.params     = {};
    this._params     = {};
    this.page       = 0;
    this.method     = "get";
    this.is_auth    = true;
    this.cache      = true;
    this.no_cache   = {};

    this.show_cnt   = 0;
    this.online     = true;

    this.setDefault = function() {
        this.view_url   = "";
        this.params     = {};
        this.page       = 0;
        this.method     = "get";
        this.is_auth    = true;
        this.cache      = true;
    };

    this.get = function() {
        this.method = "get";
        return this.load();
    };

    this.post = function() {
        this.method = "post";
        return this.load();
    };

    this.put = function() {
        this.method = "put";
        return this.load();
    };

    this.dell = function() {
        this.method = "delete";
        return this.load();
    };

    this.delete = function() {
        return this.dell();
    };

    this.load = function() {
        var config = {};
        var api_url = "api/v1";

        if (this.is_auth) {
            config = UserService.getConfig();
            if (!config) {
                return false;
            }
            //api_url = "apiuser";
        }

        var url = ConfigService.server_url() + "/"
                + api_url + "/"
                + this.view_url + "/"
                + "?prot=http:&dom=" + ConfigService.connect_url()
                + (this.page ? "&page=" + this.page : "")
                + (("get" === this.method && Object.keys(this.params).length) ? this.objToGet(this.params) : "")
                + ((Object.keys(this._params).length) ? this.objToGet(this._params) : "")
                ;

        if (this.no_cache[this.view_url]) {
            var $httpDefaultCache = $cacheFactory.get('$http');
            $httpDefaultCache.remove(url);
            delete this.no_cache[this.view_url];
        }

        if (this.cache) {
            config.cache = true;
        }

        var dfd = $q.defer();

        this.online = true;
        if (DeviceAdapterService.is_ready && $cordovaNetwork.isOffline()) {
            this.online = false;
            ToastService.showMessage("danger", "No Internet Connection");
        }

        if (!this.online && this.page) {
            return $q.reject({"data" : "No Internet Connection"});
        }

        switch (this.method) {
            case "get":
                dfd.resolve($http.get(url, config));
                break;
            case "post":
                dfd.resolve($http.post(url, this.params, config));
                break;
            case "put":
                dfd.resolve($http.put(url, this.params, config));
                break;
            case "delete":
                dfd.resolve($http.delete(url, config));
                break;
        }

//p(dfd.promise);
        var promise = dfd.promise;

        if ("get" == this.method && !this.page && this.online) {
            $ionicLoading.show();
            this.show_cnt++;

            var that = this;
            promise.then(function() {
                if (that.show_cnt === 1) {
                    $ionicLoading.hide();
                }
                that.show_cnt--;
            }, function() {
                $ionicLoading.hide();
            });
        }

        this.setDefault();

        return promise;
    };

    this.objToGet = function(obj) {
        var str = '';
        for (var p in obj) {
            if (obj.hasOwnProperty(p)) {
                str += '&' + p + '=' + obj[p];
            }
        }
        return str;
    };

    this.addNoCache = function(view_url) {
        this.no_cache[view_url] = true;
    };

    this.clearCache = function() {
        $ionicHistory.clearCache();
        var $httpDefaultCache = $cacheFactory.get('$http');
        $httpDefaultCache.removeAll();
        $rootScope.clearClipPager();
    };
});

angular.module('bazaarr').service('UserService',
function($q, $http, $rootScope, $cookies, $cookieStore, $state, $timeout, localStorageService, ConfigService, ToastService) {
    this.is_login = false;

    this.token = "";

    this.user = {};

    this.session_name = "";

    this.post_login = {};

    this.getToken = function() {
        var dfd = $q.defer();

        dfd.resolve($http.post(ConfigService.server_url() + '/services/session/token'
                + '?prot=http:&dom=' + ConfigService.connect_url(),
            {"uid" : this.user.uid}));
        return dfd.promise;
    },

    this.setUser = function(user) {
        this.user = user;
        var session = localStorageService.get("session");
        session.user = user;
        localStorageService.set("session", session);
    };

    //set user to service & LS after login
    //redirect it to account
    this.store = function(user) {
        //this.setUser();

        $cookies[user.session_name]    = user.sessid;

        localStorageService.set("session", user);

        this.token                   = user.token;
        this.is_login                = true;
        this.user                    = user.user;
        this.session_name            = user.session_name;

        $rootScope.user = this.user;
    };

    this.loginCallback = function(data) {
        this.store(data);

        if (Object.keys(this.post_login).length) {
            $state.go(this.post_login.redirect, this.post_login.params);
            if (angular.isDefined(this.post_login.broadcast) && this.post_login.broadcast.length) {
                var broadcast = this.post_login.broadcast;
                $timeout(function(){
                    $rootScope.$broadcast(broadcast);
                }, 500)
            }
            this.post_login = {};
        }
        else {
            $state.go('account.collections', {"userId" : data.user.uid});
        }
    };

    this.isConnect = function() {
        var config = this.getConfig();
        var dfd = $q.defer();

        dfd.resolve($http.post(ConfigService.server_url() + '/api/v1/system/connect'
                + '?prot=http:&dom=' + ConfigService.connect_url(),
            {}, config));
        return dfd.promise;
    }

    this.signIn = function(user, type) {
        if (!this.signInValidate(user, type)) {
            return $q.reject({"data" : ""});
        }

        type = type || "user/login";
        var config = this.getConfig();

        //user.device_id = DeviceAdapterService.getUUID();

        var dfd = $q.defer();

        dfd.resolve($http.post(ConfigService.server_url() + '/api/v1/' + type + '/'
                + '?prot=http:&dom=' + ConfigService.connect_url(),
                user));

        return dfd.promise;
    },

    this.signInValidate = function(user, type) {
        if ((angular.isUndefined(user.username) || angular.isUndefined(user.password)) && type != 'social') {
            ToastService.showMessage("danger", "Please make sure that you've entered your username and password correctly");
            return false;
        }

        return true;
    };

    this.logout = function() {
        var config = this.getConfig();

        if (!config) {
            return false;
        }

        var dfd = $q.defer();

        dfd.resolve($http.post(ConfigService.server_url() + '/api/v1/user/logout/'
                + '?prot=http:&dom=' + ConfigService.connect_url(),
            {}, config));
        return dfd.promise;
    },

    this.getConfig = function() {
        if (!this.is_login || !this.token) {
            return false;
        }

        return {
            "headers" : {
                'Content-Type'      : 'application/json', //x-www-form-urlencoded
                'X-CSRF-Token'      : this.token
            }//,
            //'withCredentials'   : true
        }
    },

    this.clearCookies = function() {
        angular.forEach($cookies, function (v, k) {
            $cookieStore.remove(k);
        });
    },

    this.clearUser = function() {
        this.token       = "";
        this.is_login    = false;
        this.user        = {};
        $rootScope.user  = {};

        //$cookieStore.remove(UserService.session_name);
        this.clearCookies();
        this.session_name = "";

        localStorageService.remove("session");
    }

    this.updateCounts = function(name, value) {

        return true;

        if(typeof this.user[name] != 'undefined'){
            var val         = parseInt(value),
            old_val         = parseInt(this.user[name]);
            this.user[name] = val ? old_val + val : old_val - 1;
            this.setUser(this.user);

            return this.user[name];
        }
    }
});

angular.module('bazaarr').service('DeviceAdapterService', function($cordovaDevice, $cordovaCamera, $compile) {
    this.is_ready = false,

    this.getUUID = function() {
        return this.is_ready ? $cordovaDevice.getUUID() : "";
    },

    this.getCameraPhoto = function() {

    },

    this.getCameraOptions = function(source_type_id, camera_direction) {
        camera_direction = camera_direction || 0;
        return {
            quality: 85,
            destinationType: Camera.DestinationType.DATA_URL,
            sourceType: source_type_id,
            allowEdit: false,
            encodingType: Camera.EncodingType.JPEG,
            //targetWidth: 1000,
            //targetHeight: 1000,
            popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: false,
            cameraDirection : camera_direction,
            correctOrientation: true
        };
    },

    this.getAndroidPushConfig = function() {
        return {
            "senderID": "708812439397"
        };
    };

    this.getInAppBrowserConfig = function() {
        if (ionic.Platform.isAndroid()) {
            return {
                location: 'yes',
                clearcache: 'no',
                toolbar: 'no',
                clearsessioncache: 'no'
            };
        }

        if (ionic.Platform.isIOS()) {
            return {
                location: 'yes',
                clearcache: 'no',
                clearsessioncache: 'no'
            };
        }
    };
});

angular.module('bazaarr').service('userPicture', function($ionicLoading, $ionicPopup, $cordovaCamera, UserService, DeviceAdapterService, AccountService, ToastService, HttpService) {

    this.popup = null;

    this.imgPopup = function(scope){
        if(AccountService.account.uid != UserService.user.uid){
            return false;
        }
        scope.image_src = UserService.user.big_picture;
        this.popup = $ionicPopup.show({
            title: 'Change your picture',
            templateUrl: 'views/popups/inputs/profile-photo.html',
            scope: scope,
            cssClass: 'profile-photo',
            buttons: [
                {text: 'Cancel'}
            ]
        });
    };

    this.closePopup = function(){
        if(this.popup){
            this.popup.close();
        }
    }

    this.uploadImage = function(scope){
        $ionicLoading.show();
        AccountService.addFile(scope.file, scope.account).then(function(data){
            var file = data.data;
            scope.account.fid       = file.fid;
            AccountService.saveAccount(scope.account, file).then(function(data){
                if(!angular.isUndefined(file) && file.fid){
                    scope.account.fid = file.fid;
                    scope.account.picture = data.data.img;
                    scope.account.big_picture = data.data.img;
                    HttpService.clearCache();
                }

                if(AccountService.account.uid == UserService.user.uid){
                    AccountService.account = scope.account;
                }
                UserService.setUser(scope.account);
                $ionicLoading.hide();
                ToastService.showMessage("success", "You changed your picture!");
            });
        },
        function(reason) {
            ToastService.showMessage("danger", reason.data);
            $ionicLoading.hide();
        });
    }

    this.openPhotoSourcePopup = function(scope, is_ready) {
        this.closePopup();
        var opts = {
            title: 'Select source',
            templateUrl: 'views/popups/photo_source.html',
            scope: scope
        },
        self = this;
        if(!is_ready){
            opts.title = 'Select Picture';
            opts.templateUrl = 'views/popups/web_photo_source.html';
            opts.buttons = [
                {
                    text: 'Select',
                    onTap: function() {
                        if(angular.isUndefined(scope.file)){
                            p('error');
                            return false;
                        }
                        scope.image_src = scope.file.file;
                        scope.file.fid = null;
                        self.uploadImage(scope);
                    }
                },
                {text: 'Cancel'}
            ]
        }

        this.photo_source_popup = $ionicPopup.show(opts);
    };

    this.closeImagePopup = function(scope){
        this.photo_source_popup.close();
    }

    this.setCanvasImage = function(element, _url, scope){
        if(angular.isUndefined(scope.file)){
            scope.file = {
                file: null
            };
        }
        var canvas      = document.getElementById('canvas'),
            MAX_WIDTH   = document.getElementById('canvas_wrapp').clientWidth,
            img         = new Image();

        var f           = element.files[0],
            url         = window.URL || window.webkitURL,
            src         = url.createObjectURL(f);

        var FR= new FileReader();
        FR.onload = function(e) {
            scope.file.file    = e.target.result;
            img.src             = src;
        };
        FR.readAsDataURL(f);
        img.onload = function() {
            if (img.width > MAX_WIDTH) {
                img.height *= MAX_WIDTH / img.width;
                img.width   = MAX_WIDTH;
            }
            var ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display    = 'block';
            canvas.width            = img.width;
            canvas.height           = img.height;

            ctx.drawImage(img, 0, 0, img.width, img.height);
            url.revokeObjectURL(src);
        };
    }

    this.changedFile = function(element, scope) {
        var p = this;
        scope.$apply(function(scope) {
            p.setCanvasImage(element, null, scope);
        });
    };

    this.addPhoto = function(source_type_id, scope, Device){
        this.closeImagePopup(scope);
        if (!Device.is_ready) {
            return false;
        }
        var p = this;
        $cordovaCamera.getPicture(Device.getCameraOptions(source_type_id, 1)).then(function(imageData) {
            if(angular.isUndefined(scope.file)){
                scope.file = {};
            }
            scope.file.file = imageData;
            scope.file.fid  = null;
            scope.image_src = "data:image/jpeg;base64," + imageData;
            p.uploadImage(scope);
        }, function(err) {
            ToastService.showMessage("danger", err);
        });
    }

});

angular.module('bazaarr').service('ClaimService',
function($rootScope, $state, $timeout, HttpService) {
    this.claim = function(params){
        HttpService.view_url    = "claim-account/create";
        HttpService.is_auth     = false;
        HttpService.params      = {'data': params};

        return HttpService.post();
    }

    this.load_users = function(search){
        HttpService.view_url    = "claim-account";
        HttpService.is_auth     = false;
        HttpService.params      = {'name': search};

        return HttpService.get();
    };
});
