import type { Entity, Scene } from 'aframe';
import type * as THREE from 'three';

/**
 * An Entity with a mesh object. Most A-Frame primitives (a-box, a-plane, etc.)
 * create mesh objects that can be accessed via getObject3D('mesh').
 */
export interface MeshEntity<
  TMaterial extends THREE.Material = THREE.MeshStandardMaterial,
> extends Entity {
  getObject3D(type: 'mesh'): THREE.Mesh<THREE.BufferGeometry, TMaterial>;
  getObject3D(type: string): THREE.Object3D;
}

type Vector3String = `${number} ${number} ${number}`;

interface BaseAFrameProps {
  id?: string;
  class?: string;
  position?: Vector3String;
  rotation?: Vector3String;
  scale?: Vector3String;
  visible?: boolean;
  animation?: string;
  'animation__*'?: string;
  children?: React.ReactNode;
}

interface PrimitiveProps extends BaseAFrameProps {
  color?: string;
  opacity?: number;
  transparent?: boolean;
  shader?: 'flat' | 'standard';
  src?: string;
  material?: string;
  geometry?: string;
}

interface APlaneProps extends PrimitiveProps {
  width?: number | string;
  height?: number | string;
  ref?: React.Ref<MeshEntity>;
}

interface ABoxProps extends PrimitiveProps {
  width?: number | string;
  height?: number | string;
  depth?: number | string;
  ref?: React.Ref<MeshEntity>;
}

interface ASphereProps extends PrimitiveProps {
  radius?: number | string;
  'segments-width'?: number;
  'segments-height'?: number;
  ref?: React.Ref<MeshEntity>;
}

interface ACylinderProps extends PrimitiveProps {
  radius?: number | string;
  height?: number | string;
  'segments-radial'?: number;
  'segments-height'?: number;
  'open-ended'?: boolean;
  'theta-start'?: number;
  'theta-length'?: number;
  ref?: React.Ref<MeshEntity>;
}

interface AConeProps extends PrimitiveProps {
  'radius-bottom'?: number | string;
  'radius-top'?: number | string;
  height?: number | string;
  ref?: React.Ref<MeshEntity>;
}

interface ACircleProps extends PrimitiveProps {
  radius?: number | string;
  segments?: number;
  'theta-start'?: number;
  'theta-length'?: number;
  ref?: React.Ref<MeshEntity>;
}

interface ARingProps extends PrimitiveProps {
  'radius-inner'?: number | string;
  'radius-outer'?: number | string;
  'segments-theta'?: number;
  'segments-phi'?: number;
  ref?: React.Ref<MeshEntity>;
}

interface ATorusProps extends PrimitiveProps {
  radius?: number | string;
  'radius-tubular'?: number | string;
  arc?: number;
  'segments-radial'?: number;
  'segments-tubular'?: number;
  ref?: React.Ref<MeshEntity>;
}

interface ASceneProps extends BaseAFrameProps {
  embedded?: boolean;
  'vr-mode-ui'?: string;
  cursor?: string;
  fog?: string;
  stats?: boolean;
  ref?: React.Ref<Scene>;
}

interface AEntityProps extends BaseAFrameProps {
  geometry?: string;
  material?: string;
  light?: string;
  camera?: string;
  ref?: React.Ref<Entity>;
}

interface ASkyProps extends BaseAFrameProps {
  color?: string;
  src?: string;
  radius?: number;
  ref?: React.Ref<MeshEntity>;
}

interface ACameraProps extends BaseAFrameProps {
  active?: boolean;
  far?: number;
  fov?: number;
  near?: number;
  'look-controls'?: string | boolean;
  'wasd-controls'?: string | boolean;
  ref?: React.Ref<Entity>;
}

interface ACursorProps extends BaseAFrameProps {
  fuse?: boolean;
  'fuse-timeout'?: number;
  color?: string;
  ref?: React.Ref<Entity>;
}

interface ATextProps extends BaseAFrameProps {
  value?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  anchor?: 'left' | 'center' | 'right' | 'align';
  baseline?: 'top' | 'center' | 'bottom';
  font?: string;
  'font-image'?: string;
  width?: number | string;
  height?: number | string;
  'wrap-count'?: number;
  'wrap-pixels'?: number;
  ref?: React.Ref<Entity>;
}

interface ALightProps extends BaseAFrameProps {
  type?: 'ambient' | 'directional' | 'hemisphere' | 'point' | 'spot';
  color?: string;
  intensity?: number;
  ref?: React.Ref<Entity>;
}

interface AImageProps extends PrimitiveProps {
  src?: string;
  width?: number | string;
  height?: number | string;
  ref?: React.Ref<MeshEntity>;
}

interface AVideoProps extends PrimitiveProps {
  src?: string;
  width?: number | string;
  height?: number | string;
  autoplay?: boolean;
  loop?: boolean;
  ref?: React.Ref<MeshEntity>;
}

interface AAssetsProps {
  timeout?: number;
  children?: React.ReactNode;
}

interface AAssetItemProps {
  id?: string;
  src?: string;
}

interface AGltfModelProps extends BaseAFrameProps {
  src?: string;
  ref?: React.Ref<Entity>;
}

interface AObjModelProps extends BaseAFrameProps {
  src?: string;
  mtl?: string;
  ref?: React.Ref<Entity>;
}

interface AColladaModelProps extends BaseAFrameProps {
  src?: string;
  ref?: React.Ref<Entity>;
}

interface ALinkProps extends BaseAFrameProps {
  href?: string;
  title?: string;
  image?: string;
  ref?: React.Ref<Entity>;
}

interface ASoundProps extends BaseAFrameProps {
  src?: string;
  autoplay?: boolean;
  loop?: boolean;
  volume?: number;
  ref?: React.Ref<Entity>;
}

interface ACurvedImageProps extends PrimitiveProps {
  src?: string;
  'theta-start'?: number;
  'theta-length'?: number;
  radius?: number | string;
  height?: number | string;
  ref?: React.Ref<MeshEntity>;
}

interface AVideoSphereProps extends PrimitiveProps {
  src?: string;
  radius?: number;
  autoplay?: boolean;
  loop?: boolean;
  ref?: React.Ref<MeshEntity>;
}

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'a-scene': ASceneProps;
        'a-entity': AEntityProps;
        'a-box': ABoxProps;
        'a-camera': ACameraProps;
        'a-circle': ACircleProps;
        'a-collada-model': AColladaModelProps;
        'a-cone': AConeProps;
        'a-cursor': ACursorProps;
        'a-curvedimage': ACurvedImageProps;
        'a-cylinder': ACylinderProps;
        'a-dodecahedron': PrimitiveProps & { ref?: React.Ref<MeshEntity> };
        'a-gltf-model': AGltfModelProps;
        'a-icosahedron': PrimitiveProps & { ref?: React.Ref<MeshEntity> };
        'a-image': AImageProps;
        'a-light': ALightProps;
        'a-link': ALinkProps;
        'a-obj-model': AObjModelProps;
        'a-octahedron': PrimitiveProps & { ref?: React.Ref<MeshEntity> };
        'a-plane': APlaneProps;
        'a-ring': ARingProps;
        'a-sky': ASkyProps;
        'a-sound': ASoundProps;
        'a-sphere': ASphereProps;
        'a-tetrahedron': PrimitiveProps & { ref?: React.Ref<MeshEntity> };
        'a-text': ATextProps;
        'a-torus-knot': ATorusProps & { ref?: React.Ref<MeshEntity> };
        'a-torus': ATorusProps;
        'a-triangle': PrimitiveProps & { ref?: React.Ref<MeshEntity> };
        'a-video': AVideoProps;
        'a-videosphere': AVideoSphereProps;
        'a-assets': AAssetsProps;
        'a-animation': BaseAFrameProps;
        'a-asset-item': AAssetItemProps;
      }
    }
  }
}

export {};
