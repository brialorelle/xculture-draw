### Set up libraries
from __future__ import division

import os
import urllib, cStringIO

import numpy as np
import scipy.stats as stats
import pandas as pd
import json
import re

from PIL import Image
import base64
import datetime
import time
import couchdb

auth = pd.read_csv('auth.txt', header = None) 
server_address_input = auth.values[0][0]
couch = couchdb.Server(server_address_input)
db = couch['tsinghua-draw'] 
db.info()

output_dir='THU_svg_data'
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

sketch_dir='THU_sketches_and_metadata'
if not os.path.exists(sketch_dir):
    os.makedirs(sketch_dir)


# X_out = pd.DataFrame([session_id, subID, category, condition, filename, ref_image_name, stroke_count, svg])

session_id = []
subID=[]
age=[]
category = []
condition=[] 
filename = []
ref_image_name = []
svg = []
stroke_count = [] 

### read in valid sessions csv
subject_log_csv= '/Users/brialong/Documents/GitHub/devphotodraw/data/THU/demographics/final_subject_info.csv'
subject_log = pd.read_csv(subject_log_csv)
total_sessions = subject_log['ID_Database_raw']
age_data = subject_log['Age']
count_sub=0



for s in total_sessions:
    sub_age = age_data[count_sub]
    count_sub = count_sub + 1
    print 'rendering for {}, gone through {} of {} subs'.format(s, count_sub, np.size(total_sessions))
    img_recs_selector = {'selector': {'dataType':'finalImage', 'subID': s}}
    img_recs_temp = db.find(img_recs_selector)
    image_recs = sorted(img_recs_temp, key=lambda image: image['endTrialTime'])
    
    print 'found {} images for {}'.format(np.size(image_recs), s)
    for imrec in image_recs:  
        stroke_recs = {'selector': {'dataType':'stroke','category':imrec['category'], 'subID': s}}
        stroke_recs_temp = db.find(stroke_recs) 
        sorted_stroke_recs = sorted(stroke_recs_temp, key=lambda stroke: stroke['endStrokeTime'])
        stroke_recs = sorted_stroke_recs
        
        try:
            if np.size(stroke_recs) > 0:
                this_stroke = 0
                _svg_list = []
                for strec in stroke_recs:
                    if (strec['svg']): # if not an empty stroke
                        this_svg = strec['svg']     
                        if (this_svg in _svg_list):  
                            print('duplicate svg')
                        elif this_svg.count(",")==1:
                            print('point only svg')
                        else:
                            this_stroke = this_stroke+1
                            svg.append(this_svg)
                            stroke_count.append(this_stroke)
                            subID.append(s)
                            session_id.append(imrec['sessionId'])        
                            category.append(imrec['category'])
                            condition.append(imrec['condition'])
                            age.append(sub_age)
                            filename.append(os.path.join(sketch_dir,'{}_sketch_{}_{}.png'.format(imrec['category'], imrec['subID'], imrec['condition'])))            
                            ## photodraw2 specific variables
                            try:
                                ref_image_name.append(imrec['imageName'])
                            except:
                                ref_image_name.append(imrec['category'])
                                # print 'subbed category for imagename for category {}'.format(imrec['category'])

        except Exception as e:
            print 'Oops, something went wrong! Here is the error:'  
            print e
            pass

        # test it
        if (count_sub==3):
            X_out = pd.DataFrame([session_id, subID, age, category, condition, filename, ref_image_name, stroke_count, svg])
            X_out = X_out.transpose()
            X_out.columns = ['session_id','subID','age','category','condition','filename', 'ref_image_name', 'stroke_count','svg']
            X_out.to_csv(os.path.join(output_dir, 'THU_photodraw_e2' + '_svg_output' + '2022.csv'))

X_out = pd.DataFrame([session_id, subID, age, category, condition, filename, ref_image_name, stroke_count, svg])
X_out = X_out.transpose()
X_out.columns = ['session_id','subID','age','category','condition','filename', 'ref_image_name','stroke_count','svg']
X_out.to_csv(os.path.join(output_dir, 'THU_photodraw_e2' + '_svg_output' + '2022.csv'))

