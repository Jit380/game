shader_type spatial;
varying vec3 world;
varying vec3 normal_world;
uniform vec4 base_color : source_color = vec4(0.4,0.4,0.4,1.0);
void vertex(){world=(MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;normal_world=MODEL_NORMAL_MATRIX*NORMAL;}
void fragment(){
 vec2 p=vec2(abs(normal_world.x)>0.5?world.z:world.x,world.y);
 float row=floor(p.y/.24);vec2 brick=fract(vec2((p.x+mod(row,2.0)*.35)/.7,p.y/.24));
 float mortar=step(.025,brick.x)*step(.05,brick.y);
 vec2 cell=fract(p/vec2(3.3,3.8));float window=step(.27,cell.x)*step(cell.x,.73)*step(.22,cell.y)*step(cell.y,.76);
 float frame=step(.245,cell.x)*step(cell.x,.755)*step(.20,cell.y)*step(cell.y,.78);
 vec3 facade=base_color.rgb*mix(.65,1.0,mortar);
 facade=mix(facade,vec3(.18,.20,.21),frame);
 facade=mix(facade,vec3(.12,.23,.30),window);
 float lit=step(.74,fract(sin(dot(floor(p/vec2(3.3,3.8)),vec2(127.1,311.7)))*43758.5453));
 ALBEDO=facade;ROUGHNESS=mix(.85,.20,window);METALLIC=window*.45;EMISSION=window*lit*vec3(.27,.15,.055);
}
