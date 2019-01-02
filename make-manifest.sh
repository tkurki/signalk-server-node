cat >docker-manifest.yml <<EOF
image: 'tkurki/signalk-server:$BRANCH'
manifests:
  -
    image: 'tkurki/signalk-server:linux-amd64-$BRANCH'
    platform:
      architecture: amd64
      os: linux
  -
    image: 'tkurki/signalk-server:linux-arm32v7-$BRANCH'
    platform:
      architecture: arm
      variant: v7
      os: linux