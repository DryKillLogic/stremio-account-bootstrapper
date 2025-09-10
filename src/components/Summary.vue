<script setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
  <section id="features">
    <h2>{{ t('what_does_it_do_title') }}</h2>
    <p>{{ t('what_does_it_do_desc') }}</p>
    <div class="hide-xs">
      <h2>{{ t('which_addons_title') }}</h2>
      <div class="row">
        <div class="col-2 text-center">
          <img src="/public/logos/torrentio.png" alt="Torrentio" />
          <p>Torrentio</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/comet.png" alt="Comet" />
          <p>Comet</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/mediafusion.png" alt="MediaFusion" />
          <p>MediaFusion</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/jackettio.png" alt="Jackettio" />
          <p>Jackettio</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/torrentsdb.png" alt="TorrentsDB" />
          <p>TorrentsDB</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/peerflix.png" alt="Peerflix" />
          <p>Peerflix</p>
        </div>
      </div>
      <div class="row">
        <div class="col-2 text-center">
          <img src="/public/logos/torbox.png" alt="TorBox" />
          <p>TorBox</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/tpbplus.png" alt="ThePirateBay+" />
          <p>ThePirateBay+</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/nuvio.png" alt="Nuvio Streams" />
          <p>Nuvio Streams</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/webstreamr.png" alt="WebStreamr" />
          <p>WebStreamr</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/aiolists.png" alt="AIOLists" />
          <p>AIOLists</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/cinemeta.png" alt="Cinemeta" />
          <p>Cinemeta</p>
        </div>
      </div>
      <div class="row">
        <div class="col-2 text-center">
          <img src="/public/logos/subhero.png" alt="SubHero" />
          <p>SubHero</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/subsource.png" alt="SubSource" />
          <p>SubSource</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/subdivx.png" alt="Subdivx" />
          <p>Subdivx</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/localfiles.png" alt="Local Files" />
          <p>Local Files</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/kitsu.png" alt="Anime Kitsu" />
          <p>Anime Kitsu</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/usatv.png" alt="USA TV" />
          <p>USA TV</p>
        </div>
      </div>
      <div class="row">
        <div class="col-2 text-center">
          <img src="/public/logos/argentinatv.png" alt="Argentina TV" />
          <p>Argentina TV</p>
        </div>
        <div class="col-2 text-center">
          <img src="/public/logos/streamasia.png" alt="StreamAsia" />
          <p>StreamAsia</p>
        </div>
      </div>
    </div>
    <h2>{{ t('instructions_title') }}</h2>
    <ol>
      <li v-html="t('instructions_1')"></li>
      <li>{{ t('instructions_2') }}</li>
      <li v-html="t('instructions_3')"></li>
      <li>{{ t('instructions_4') }}</li>
      <li v-html="t('instructions_5')"></li>
      <li>{{ t('instructions_6') }}</li>
      <li v-html="t('instructions_7')"></li>
      <li>{{ t('instructions_8') }}</li>
      <li>{{ t('instructions_9') }}</li>
      <li>{{ t('instructions_10') }}</li>
      <li>{{ t('instructions_11') }}</li>
    </ol>
    <p class="text-center" v-html="t('warning')"></p>
    <p>
      <br />
      <i>{{ t('note') }}</i>
    </p>
  </section>
</template>
