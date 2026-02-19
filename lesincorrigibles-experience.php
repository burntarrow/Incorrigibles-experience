<?php
/**
 * Plugin Name: Les Incorrigibles – Experience Layer
 * Description: Grain overlay, site audio toggle/autoplay helper, hero fade, cube mouse tension, and “misbehave” typography.
 * Version: 0.2.2
 */

if (!defined('ABSPATH')) exit;

add_action('wp_enqueue_scripts', function () {
  if (is_admin()) return;

  $base_url = plugin_dir_url(__FILE__); // points to .../plugins/lesincorrigibles-experience/
  $ver = '0.2.1';

  // ✅ Sitewide assets (lightweight; JS exits early if selectors missing)
  wp_enqueue_style(
    'li-experience',
    $base_url . 'assets/li-experience.css',
    [],
    $ver
  );

  wp_enqueue_script(
    'li-experience',
    $base_url . 'assets/li-experience.js',
    [],
    $ver,
    true
  );

  // Central config you can tweak without hunting through JS
  $config = [
    'selectors' => [
      // hero-ish
      'heroSection' => '.grain-wrap',
      'cube'        => '.fade-cube',
      'title'       => '.fade-title',
      'misbehave'   => '.misbehave-word',

      // audio sitewide
      'audio'       => '#site-audio',
      'audioToggle' => '#audio-toggle',
    ],

    'fade' => [
      'cube'  => ['start' => 0.80, 'end' => 0.92],
      'title' => ['start' => 0.90, 'end' => 0.99],
      'titleMotion' => [
        'start' => 0.94, 'end' => 1.00,
        'scaleFrom' => 1.00, 'scaleTo' => 1.18,
        'yFrom' => 0, 'yTo' => -50
      ],
    ],
    
    'cubeScale' => [
        'start' => 1.00,   // start immediately
        'end'   => 0.20,   // reaches 0.95 after 20% of the section scroll (tune)
        'to'    => 0.95
        ],


    'cubeMouse' => [
      // px translation & degrees rotation at max effect
        'maxTranslate' => 18,
        'maxRotate'    => 5,
      // smoothing: higher = slower ease
        'ease'         => 0.10,
        'boostStart'   => 0.80,
        'boostEnd'     => 1.00,
        'boostTo'      => 1.60,
      // optional: only activate when mouse is inside this container; falls back to cube element
        'containerSelector' => null,
    ],

    'misbehave' => [
      'scatter' => ['start' => 0.88, 'end' => 1.20],
      'strength' => ['dx' => 18, 'dy' => 10, 'rot' => 8],
      'shake' => ['durationMs' => 420, 'freqHz' => 20, 'rotateDeg' => 0.8],
      // shake re-triggers if user scrolls back above end by this margin
      'resetMargin' => 0.03,
    ],

    'audio' => [
      'remember'     => true,   // localStorage preference
      'defaultState' => 'on', // 'muted' or 'on'
      'fadeInMs'     => 5000,
      'targetVolume' => 1,
      // when true: first user click/tap anywhere can enable audio (optional)
      'unlockOnFirstGesture' => true,
    ],
  ];

  wp_localize_script('li-experience', 'LI_EXPERIENCE', $config);
}, 20);
