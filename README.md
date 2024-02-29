# Boxcar

Drive a train!

You can always try the latest build here: https://thomasburgess2000.github.io/boxcar/.

## Build

`bun build ./index.ts --outdir ./build --watch`

## Run

`bun --hot run server.ts`


## TODO:
- [ ] Make perimetric LOD
- [ ] Create new map data when the camera moves outside the current map
- [x] Fix tree spawning
- [x] Add trees to the dynamic terrain
- [ ] make the trees generate/dispose as you move
- [ ] Add walkable player
- [x] Make larger map
- [x] Clean up dynamic terrain system (move params to component)
- [ ] Dispose far away track
- [ ] Add wheels to train
- [ ] Be able to lower maxSubZ without terrain clipping through track (fix flattening falloff probably?)
- [ ] Make fog work with dynamic terrain shader
- [ ] Clean up game.ts