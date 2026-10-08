"""Build original rigged characters and animation clips; no third-party art required."""
import bpy, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]/'assets'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,metal=0,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.55
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 return m
suit=material('Graphite woven suit',(.022,.035,.055));armor=material('Ceramic armor',(.065,.105,.14),.4);skin=material('Skin',(.75,.43,.28));hair=material('Midnight teal hair',(.015,.12,.16));trim=material('Dragon amber',(.95,.42,.075),.25,.5);white=material('Eye whites',(.97,.91,.8));iris=material('Amber eyes',(.96,.56,.07));ink=material('Ink',(.008,.012,.018));cloth=material('Burnt orange scarf',(.48,.09,.035))
parts=[]
def finish(o,name,m,bone):
 o.name=name;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);parts.append((o,bone));return o

def ell(name,pos,scale,m,bone):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=pos);o=bpy.context.object;o.scale=scale;return finish(o,name,m,bone)
def segment(name,a,b,r1,r2,m,bone):
 a,b=Vector(a),Vector(b);v=b-a;bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=r1,radius2=r2,depth=v.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();bevel=o.modifiers.new('Soft seams','BEVEL');bevel.width=.015;bevel.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name);return finish(o,name,m,bone)
def plate(name,pos,scale,m,bone):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);mod=o.modifiers.new('Rounded panel','BEVEL');mod.width=.035;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name);return finish(o,name,m,bone)
def profile(name,rings,m,bone):
 verts=[];faces=[];n=24
 for z,rx,ry,cy in rings:
  for i in range(n):a=math.tau*i/n;verts.append((math.cos(a)*rx,cy+math.sin(a)*ry,z))
 for j in range(len(rings)-1):
  for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
 faces.extend([tuple(range(n-1,-1,-1)),tuple((len(rings)-1)*n+i for i in range(n))]);mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return finish(o,name,m,bone)
profile('Tailored torso',[(.85,.14,.10,0),(.99,.16,.10,0),(1.12,.18,.12,0),(1.30,.24,.135,0),(1.40,.225,.11,0),(1.46,.13,.09,0)],suit,'spine')
ell('Pelvis',(0,0,.86),(.17,.105,.13),suit,'hips');segment('Neck',(0,0,1.39),(0,0,1.54),.067,.07,skin,'head')
profile('Sculpted anime head',[(1.51,.065,.06,-.015),(1.55,.09,.08,-.025),(1.61,.125,.11,-.008),(1.71,.14,.12,0),(1.80,.13,.11,.01),(1.86,.08,.075,.015)],skin,'head')
ell('Nose',(0,-.123,1.655),(.025,.028,.036),skin,'head');ell('Mouth',(0,-.092,1.575),(.035,.008,.005),ink,'head')
for side in [-1,1]:
 x=side*.059
 ell('Large anime eye',(x,-.112,1.706),(.047,.023,.047),white,'head');ell('Amber iris',(x,-.133,1.707),(.024,.008,.034),iris,'head');ell('Pupil',(x,-.14,1.707),(.009,.004,.025),ink,'head');ell('Eye highlight',(x-.007,-.145,1.721),(.008,.002,.01),white,'head')
 segment('Upper eyelid',(x-side*.042,-.127,1.744),(x+side*.04,-.125,1.746),.006,.006,ink,'head');segment('Focused brow',(x-side*.041,-.112,1.770),(x+side*.047,-.102,1.784),.009,.008,hair,'head');ell('Ear',(side*.137,0,1.683),(.025,.022,.047),skin,'head')
ell('Hair crown',(0,.022,1.804),(.148,.135,.086),hair,'head')
for i in range(28):
 a=i*2.4;r=.06+(i%4)*.026;z=1.84+(i%3)*.022;segment('Layered hair lock',(math.cos(a)*r,math.sin(a)*r,z),(math.cos(a)*(r+.035),math.sin(a)*(r+.055),z+.09+(i%4)*.015),.046,.002,hair,'head')
# Front fringe locks swept across forehead.
for i in range(7):x=(i-3)*.035;segment('Swept fringe',(x,-.07,1.84),(x+.018,-.136,1.765-(i%3)*.013),.035,.001,hair,'head')
for side in [-1,1]:
 tag='L' if side<0 else 'R';x=side*.115
 segment('Thigh '+tag,(x,0,.87),(x,-.005,.49),.082,.067,suit,'thigh_'+tag);ell('Knee '+tag,(x,-.018,.47),(.068,.07,.078),armor,'calf_'+tag);segment('Calf '+tag,(x,0,.47),(x,.012,.11),.064,.042,suit,'calf_'+tag);plate('Articulated boot '+tag,(x,-.055,.075),(.125,.26,.12),armor,'foot_'+tag);plate('Orange sole '+tag,(x,-.055,.018),(.127,.263,.026),cloth,'foot_'+tag)
 segment('Shin piping '+tag,(x+side*.04,-.055,.43),(x+side*.028,-.031,.16),.009,.007,trim,'calf_'+tag)
 shoulder=(side*.24,0,1.365);elbow=(side*.295,-.012,1.14);wrist=(side*.318,-.016,.95)
 ell('Shoulder '+tag,shoulder,(.096,.102,.089),armor,'upper_'+tag);segment('Upper arm '+tag,shoulder,elbow,.067,.051,suit,'upper_'+tag);ell('Elbow '+tag,elbow,(.054,.055,.056),armor,'fore_'+tag);segment('Forearm '+tag,elbow,wrist,.061,.045,armor,'fore_'+tag);ell('Gloved hand '+tag,(side*.32,-.017,.905),(.048,.035,.057),suit,'hand_'+tag)
 for j in range(4):segment('Finger '+tag,(side*.32+(j-1.5)*.018,-.016,.893),(side*.32+(j-1.5)*.018,-.023,.86),.008,.006,suit,'hand_'+tag)
 plate('Chest plate '+tag,(side*.102,-.12,1.31),(.17,.038,.16),armor,'spine');plate('Utility pouch '+tag,(side*.135,-.09,.96),(.07,.07,.10),armor,'hips');segment('Suit piping '+tag,(side*.19,-.099,1.25),(side*.135,-.095,1.02),.009,.008,trim,'spine')
# Original angular dragon insignia and soft scarf.
segment('Dragon insignia left',(-.045,-.145,1.32),(0,-.148,1.23),.009,.007,trim,'spine');segment('Dragon insignia right',(.045,-.145,1.32),(0,-.148,1.23),.009,.007,trim,'spine')
ell('Scarf collar',(0,0,1.49),(.095,.089,.035),cloth,'head');profile('Scarf tail',[(1.13,.034,.018,.14),(1.27,.043,.02,.16),(1.42,.04,.02,.11),(1.50,.03,.02,.05)],cloth,'spine')
# Weighted skeleton: deforming animation clips rather than floating parts.
bpy.ops.object.armature_add();rig=bpy.context.object;rig.name='UltimatemanRig';bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
bones={}
def bone(name,a,b,parent=None):
 e=rig.data.edit_bones.new(name);e.head=a;e.tail=b
 if parent:e.parent=bones[parent]
 bones[name]=e
bone('hips',(0,0,.80),(0,0,.98));bone('spine',(0,0,.98),(0,0,1.43),'hips');bone('head',(0,0,1.43),(0,0,1.85),'spine')
for side in [-1,1]:
 t='L' if side<0 else 'R';x=side*.115;bone('thigh_'+t,(x,0,.87),(x,0,.47),'hips');bone('calf_'+t,(x,0,.47),(x,0,.09),'thigh_'+t);bone('foot_'+t,(x,0,.09),(x,-.13,.06),'calf_'+t);bone('upper_'+t,(side*.24,0,1.365),(side*.295,-.012,1.14),'spine');bone('fore_'+t,(side*.295,-.012,1.14),(side*.318,-.016,.95),'upper_'+t);bone('hand_'+t,(side*.318,-.016,.95),(side*.32,-.017,.87),'fore_'+t)
bpy.ops.object.mode_set(mode='OBJECT')
for o,name in parts:
 g=o.vertex_groups.new(name=name);g.add(list(range(len(o.data.vertices))),1,'REPLACE');mod=o.modifiers.new('Rig deformation','ARMATURE');mod.object=rig;o.parent=rig
bpy.ops.object.select_all(action='DESELECT')
for o,name in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0][0]
bpy.ops.object.join()
bpy.context.object.name='Original anime hero — weighted suit and face'
rig.animation_data_create()
for name in ['Idle','Run','Jump','Attack']:
 action=bpy.data.actions.new(name);rig.animation_data.action=action
 for frame in [1,7,13,19,25]:
  t=(frame-1)/24*math.tau
  for pb in rig.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
  if name=='Run':
   for side,tag in [(1,'L'),(-1,'R')]:rig.pose.bones['thigh_'+tag].rotation_euler.x=math.sin(t)*.65*side;rig.pose.bones['calf_'+tag].rotation_euler.x=max(0,-math.sin(t)*side)*.8;rig.pose.bones['upper_'+tag].rotation_euler.x=-math.sin(t)*.6*side;rig.pose.bones['fore_'+tag].rotation_euler.x=-.5
   rig.pose.bones['spine'].rotation_euler.x=.1;rig.pose.bones['hips'].location.z=abs(math.sin(t))*.045
  elif name=='Idle':rig.pose.bones['spine'].rotation_euler.x=math.sin(t)*.025;rig.pose.bones['head'].rotation_euler.z=math.sin(t)*.025
  elif name=='Jump':
   for tag in ['L','R']:rig.pose.bones['upper_'+tag].rotation_euler.x=-.7;rig.pose.bones['thigh_'+tag].rotation_euler.x=-.4;rig.pose.bones['calf_'+tag].rotation_euler.x=.7
  elif name=='Attack':rig.pose.bones['upper_R'].rotation_euler.x=-math.sin(t/2)*1.45;rig.pose.bones['fore_R'].rotation_euler.x=-.25;rig.pose.bones['spine'].rotation_euler.z=math.sin(t/2)*.2
  for pb in rig.pose.bones:pb.keyframe_insert('rotation_euler',frame=frame);pb.keyframe_insert('location',frame=frame)
 track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action)
rig.animation_data.action=None
bpy.context.scene.frame_set(1)
ROOT.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'ultimateman.glb'),export_format='GLB',export_animations=True,export_nla_strips=True)
print('Built original rigged character with Idle, Run, Jump, Attack clips')
